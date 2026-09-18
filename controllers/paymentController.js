const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, receipt, orderDetails, applyWallet, items, shippingAddress } = req.body;
        
        let user = null;
        const token = req.cookies?.customer_token || 
                      req.cookies?.token || 
                      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
                      
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id);
            } catch (err) {
                console.error("JWT verify error in createOrder:", err);
            }
        }

        const deduction = (applyWallet && user) ? Math.min(user.walletBalance, amount) : 0;
        const finalPaidAmount = amount - deduction;

        if (applyWallet && finalPaidAmount < 1) {
            // Zero payment bypass
            const orderIdStr = 'ORD' + Math.floor(100000 + Math.random() * 900000);
            
            const mappedItems = items ? items.map(item => ({
                product: item.productId || item._id || null,
                name: item.title || item.name,
                price: Number(item.price),
                quantity: item.qty || item.quantity || 1,
                image: item.image
            })) : [];

            const order = new Order({
                orderId: orderIdStr,
                orderNumber: orderIdStr,
                user: user._id,
                customer: {
                    name: shippingAddress?.name,
                    email: shippingAddress?.email,
                    phone: shippingAddress?.phone,
                    address: {
                        street: shippingAddress?.address,
                        city: shippingAddress?.city,
                        state: shippingAddress?.state,
                        pinCode: shippingAddress?.pinCode,
                        notes: shippingAddress?.notes
                    }
                },
                items: mappedItems,
                totalAmount: amount,
                walletDiscount: deduction,
                finalPaidAmount: 0,
                orderStatus: 'processing',
                paymentStatus: 'paid'
            });
            await order.save();

            user.walletBalance -= deduction;
            user.walletHistory.push({
                amount: deduction,
                type: 'debit',
                description: `Used on order #${order.orderNumber || orderIdStr}`,
                orderId: order._id
            });
            
            const previousOrdersCount = await Order.countDocuments({ 'customer.email': user.email, orderStatus: { $in: ['processing', 'manifested', 'completed'] } });
            const earnedCashback = previousOrdersCount === 0 ? 2 : 1;
            
            user.walletBalance += earnedCashback;
            user.walletHistory.push({
                amount: earnedCashback,
                type: 'credit',
                description: `Cashback for Order #${order.orderNumber || orderIdStr}`,
                orderId: order._id
            });
            await user.save();

            return res.json({
                success: true,
                zeroPayment: true,
                orderId: order._id,
                earnedCashback
            });
        }

        const amountInPaise = Math.round(finalPaidAmount * 100);

        const rzpOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: receipt || `rcpt_${Date.now()}`
        });

        res.json({
            success: true,
            order: rzpOrder,
            key: process.env.RAZORPAY_KEY_ID,
            deduction
        });
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ success: false, message: "Error creating order" });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, shippingAddress, applyWallet } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Generate unique order ID
            const orderIdStr = 'ORD' + Math.floor(100000 + Math.random() * 900000);

            // Calculate total amount from items to be safe or get from request, assuming get from items for simplicity
            let totalAmount = 0;
            if (items && items.length > 0) {
                totalAmount = items.reduce((acc, item) => {
                    const price = Number(item.price) || 0;
                    const qty = item.qty || item.quantity || 1;
                    return acc + (price * qty);
                }, 0);
            }
            // Add shipping if applicable (basic logic matching frontend)
            const shipping = totalAmount > 500 ? 0 : 50;
            totalAmount += shipping;

            // Map frontend items format to backend format if necessary
            const mappedItems = items ? items.map(item => ({
                product: item.productId || item._id || null, // Assuming you have productId
                name: item.title || item.name,
                price: Number(item.price),
                quantity: item.qty || item.quantity || 1,
                image: item.image
            })) : [];

            const order = new Order({
                orderId: orderIdStr,
                orderNumber: orderIdStr,
                customer: {
                    name: shippingAddress?.name,
                    email: shippingAddress?.email,
                    phone: shippingAddress?.phone,
                    address: {
                        street: shippingAddress?.address,
                        city: shippingAddress?.city,
                        state: shippingAddress?.state,
                        pinCode: shippingAddress?.pinCode,
                        notes: shippingAddress?.notes
                    }
                },
                items: mappedItems,
                totalAmount: totalAmount,
                walletDiscount: 0,
                finalPaidAmount: totalAmount,
                orderStatus: 'processing',
                paymentStatus: 'paid',
                razorpay_order_id,
                razorpay_payment_id
            });

            let earnedCashback = 0;
            let newWalletBalance = 0;

            console.log('[WALLET DEBUG] Received verification. Cookies:', req.cookies, 'Headers:', req.headers.authorization);

            let userId = null;
            const token = req.cookies?.customer_token || 
                          req.cookies?.token || 
                          (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
            
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.id || decoded._id || decoded.userId;
                } catch (err) {
                    console.error('[WALLET DEBUG] Token decode failed:', err.message);
                }
            }

            if (!userId && req.body.userId) {
                userId = req.body.userId;
            }

            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    order.user = user._id;
                    const deduction = applyWallet ? Math.min(Number(user.walletBalance) || 0, totalAmount) : 0;
                    order.walletDiscount = deduction;
                    order.finalPaidAmount = totalAmount - deduction;
                    
                    if (deduction > 0) {
                        user.walletBalance = (Number(user.walletBalance) || 0) - deduction;
                        user.walletHistory.push({
                            amount: deduction,
                            type: 'debit',
                            description: `Used on order #${order.orderNumber || orderIdStr}`,
                            orderId: order._id,
                            createdAt: new Date()
                        });
                    }
                    
                    const previousOrdersCount = await Order.countDocuments({ user: user._id, orderStatus: { $ne: 'cancelled' } });
                    earnedCashback = previousOrdersCount === 0 ? 2 : 1;
                    
                    user.walletBalance = (Number(user.walletBalance) || 0) + earnedCashback;
                    user.walletHistory.push({
                        amount: earnedCashback,
                        type: 'credit',
                        description: `Cashback for Order #${order.orderNumber || orderIdStr}`,
                        orderId: order._id,
                        createdAt: new Date()
                    });
                    
                    await user.save();
                    newWalletBalance = user.walletBalance;
                    console.log(`[WALLET DEBUG] Successfully credited ₹${earnedCashback}. New Balance: ₹${user.walletBalance} for user ${user._id}`);
                } else {
                    console.error('[WALLET DEBUG] User not found for ID:', userId);
                }
            } else {
                console.error('[WALLET DEBUG] No userId identified! Cashback could not be credited to database.');
            }
            
            await order.save();

            res.json({ success: true, orderId: order.orderNumber || order._id, earnedCashback, newWalletBalance });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.status(500).json({ success: false, message: "Error verifying payment" });
    }
};
