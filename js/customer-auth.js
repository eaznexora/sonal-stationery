// Storefront Customer Auth Script

(function() {
    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/customer-auth.css';
    document.head.appendChild(link);

    // Google script
    const gsiScript = document.createElement('script');
    gsiScript.src = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.defer = true;
    document.head.appendChild(gsiScript);

    const GOOGLE_CLIENT_ID = '957324918401-ek412uhtdu0kh6kqfo6dfi1j2v0johg2.apps.googleusercontent.com';

    // Build Modal HTML
    const modalHtml = `
        <div id="customerAuthModal">
            <div class="auth-card">
                <button class="close-btn" id="authCloseBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h3>Welcome to Sonal Stationery</h3>
                <div class="auth-prompt" id="authPromptMsg">Login to complete your order</div>
                <div class="auth-error" id="authErrorMsg"></div>
                
                <div id="authStep1">
                    <div class="google-btn-container" id="googleSignInBtn"></div>
                    
                    <div class="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>
                    
                    <form id="authEmailForm">
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" id="authEmailInput" required placeholder="Enter your email">
                        </div>
                        <button type="submit" class="primary-btn" id="authSendOtpBtn">Send Verification Code</button>
                    </form>
                </div>

                <div id="authStep2" style="display:none;">
                    <p style="font-size:14px;color:#71717A;margin-bottom:20px;">Enter the 6-digit code sent to <br><b id="authDisplayEmail" style="color:#2C3E2D;"></b></p>
                    <div class="otp-inputs" id="authOtpContainer">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                        <input type="text" maxlength="1" pattern="[0-9]" inputmode="numeric">
                    </div>
                    <button type="button" class="primary-btn" id="authVerifyOtpBtn">Verify Code</button>
                    <div class="resend-text">
                        Didn't receive a code? 
                        <button type="button" class="resend-btn" id="authResendBtn" disabled>Resend in <span id="authTimer">60</span>s</button>
                    </div>
                    <button type="button" class="change-email-btn" onclick="document.getElementById('authStep2').style.display='none';document.getElementById('authStep1').style.display='block';">Use a different email</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('customerAuthModal');
    const closeBtn = document.getElementById('authCloseBtn');
    const promptMsg = document.getElementById('authPromptMsg');
    const errorMsg = document.getElementById('authErrorMsg');
    
    let pendingCallback = null;
    let authEmail = '';
    let countdownInterval = null;

    // Initialize Google Sign-in when script loads
    gsiScript.onload = () => {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse
        });
    };

    function showError(msg) {
        errorMsg.innerText = msg;
        errorMsg.style.display = 'block';
    }

    function clearError() {
        errorMsg.style.display = 'none';
        errorMsg.innerText = '';
    }

    function renderGoogleButton() {
        const btnContainer = document.getElementById('googleSignInBtn');
        if (window.google && btnContainer && btnContainer.innerHTML === '') {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: 'outline', size: 'large', width: btnContainer.offsetWidth || 376 }
            );
        }
    }

    async function handleGoogleCredentialResponse(response) {
        try {
            const res = await fetch('/api/auth/customer/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
            });
            const data = await res.json();
            if (data.success) {
                closeModal();
                if (pendingCallback) pendingCallback();
            } else {
                showError(data.message || 'Google login failed');
            }
        } catch (err) {
            showError('Network error during Google login');
        }
    }

    // Modal behavior
    function openModal(callback, msg) {
        pendingCallback = callback;
        promptMsg.innerText = msg || 'Login to complete your order';
        modal.classList.add('active');
        document.getElementById('authStep1').style.display = 'block';
        document.getElementById('authStep2').style.display = 'none';
        clearError();
        // Give modal a tiny bit of time to display block before rendering GSI so width calculates right
        setTimeout(renderGoogleButton, 10);
    }

    function closeModal() {
        modal.classList.remove('active');
        pendingCallback = null;
        if (countdownInterval) clearInterval(countdownInterval);
    }

    closeBtn.addEventListener('click', closeModal);

    // Email OTP Flow
    document.getElementById('authEmailForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();
        const emailInput = document.getElementById('authEmailInput');
        authEmail = emailInput.value.trim();
        const btn = document.getElementById('authSendOtpBtn');
        btn.disabled = true;
        btn.innerText = 'Sending...';

        try {
            const res = await fetch('/api/auth/customer/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('authStep1').style.display = 'none';
                document.getElementById('authStep2').style.display = 'block';
                document.getElementById('authDisplayEmail').innerText = authEmail;
                startResendTimer();
                const inputs = document.querySelectorAll('#authOtpContainer input');
                inputs[0].focus();
            } else {
                showError(data.message || 'Failed to send OTP');
            }
        } catch (err) {
            showError('Network error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Send Verification Code';
        }
    });

    // OTP Input logic
    const otpInputs = document.querySelectorAll('#authOtpContainer input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    document.getElementById('authVerifyOtpBtn').addEventListener('click', async () => {
        clearError();
        let otp = '';
        otpInputs.forEach(input => otp += input.value);
        if (otp.length !== 6) {
            showError('Please enter a 6-digit OTP');
            return;
        }

        const btn = document.getElementById('authVerifyOtpBtn');
        btn.disabled = true;
        btn.innerText = 'Verifying...';

        try {
            const res = await fetch('/api/auth/customer/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, otp })
            });
            const data = await res.json();
            if (data.success) {
                closeModal();
                if (pendingCallback) pendingCallback();
            } else {
                showError(data.message || 'Invalid OTP');
            }
        } catch (err) {
            showError('Network error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Verify Code';
        }
    });

    // Resend Timer logic
    function startResendTimer() {
        const resendBtn = document.getElementById('authResendBtn');
        const timerSpan = document.getElementById('authTimer');
        let timeLeft = 60;
        resendBtn.disabled = true;
        
        if (countdownInterval) clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Now';
            }
        }, 1000);
    }

    document.getElementById('authResendBtn').addEventListener('click', () => {
        document.getElementById('authEmailForm').dispatchEvent(new Event('submit'));
    });

    // Global exposed function
    window.requireCustomerAuth = async function(callback, promptMessage) {
        try {
            const res = await fetch('/api/auth/customer/me');
            const data = await res.json();
            if (data.success && data.authenticated) {
                callback(); // Already logged in
            } else {
                openModal(callback, promptMessage); // Not logged in
            }
        } catch (err) {
            openModal(callback, promptMessage); // On error, fallback to login
        }
    };
})();
