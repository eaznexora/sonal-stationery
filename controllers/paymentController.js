const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, receipt, orderDetails } = req.body;
        
        const amountInPaise = Math.round(amount * 100);

        const rzpOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: receipt || `rcpt_${Date.now()}`
        });

        res.json({
            success: true,
            order: rzpOrder,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ success: false, message: "Error creating order" });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, shippingAddress } = req.body;

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
                orderStatus: 'processing',
                paymentStatus: 'paid',
                razorpay_order_id,
                razorpay_payment_id
            });

            await order.save();

            res.json({ success: true, orderId: order._id });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.status(500).json({ success: false, message: "Error verifying payment" });
    }
};
