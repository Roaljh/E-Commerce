const validateConfig = () => {
    const requiredEnvVars = [
        'MONGODB_URI',
        'SESSION_SECRET',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'ADMIN_EMAIL',
        'ADMIN_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingVars.length > 0) {
        console.error('Error: Missing required environment variables:');
        missingVars.forEach(variable => {
            console.error(`- ${variable}`);
        });
        console.error('\nPlease add these variables to your .env file');
        process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.ADMIN_EMAIL)) {
        console.error('Error: ADMIN_EMAIL must be a valid email address');
        process.exit(1);
    }

    // Validate SMTP port
    const port = parseInt(process.env.SMTP_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: SMTP_PORT must be a valid port number (1-65535)');
        process.exit(1);
    }

    // Validate MongoDB URI
    if (!process.env.MONGODB_URI.startsWith('mongodb')) {
        console.error('Error: MONGODB_URI must be a valid MongoDB connection string');
        process.exit(1);
    }

    console.log('✓ Environment variables validated successfully');
};

module.exports = validateConfig;
