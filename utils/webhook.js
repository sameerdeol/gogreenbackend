const { exec } = require('child_process');

const webhookHandler = async (req, res) => {
    console.log('✅ GitHub webhook triggered!');

    // Step 1: Git pull
    exec('git pull origin main', async (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Git pull failed:', err);
            return res.status(500).send('Git pull failed');
        }

        console.log('📥 Git Pull Output:', stdout);

        // Step 2: PM2 restart
        exec('pm2 restart server.js', async (err2, stdout2, stderr2) => {
            if (err2) {
                console.error('❌ PM2 restart failed:', err2);
                return res.status(500).send('PM2 restart failed');
            }

            res.status(200).send('✅ Git pulled, server restarted, vendor notified');
        });
    });
};

module.exports = webhookHandler;
