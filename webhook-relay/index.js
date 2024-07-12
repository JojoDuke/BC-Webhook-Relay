const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;
const discordWebhookUrl = 'https://discord.com/api/webhooks/1261274741893890111/Mt83Hts7Jh8UOZiTVtfhE1Lf6ExMlJJseWkTXwfLcleC0Fraog37uKe4mIKoZzekniVC';

app.use(express.json());

app.post('/webhook', async (req, res) => {
    try {
      const { event, data } = req.body;
  
      // Customize the message content for Discord
      const discordMessage = {
        content: `New Event: ${event}\nDetails: ${JSON.stringify(data, null, 2)}`
      };
  
      // Send the message to Discord
      await axios.post(discordWebhookUrl, discordMessage);
  
      res.status(200).send('Webhook received and forwarded to Discord');
    } catch (error) {
      console.error('Error forwarding webhook to Discord:', error);
      res.status(500).send('Error processing webhook');
    }
  });
  
  app.listen(port, () => {
    console.log(`Webhook relay server listening at http://localhost:${port}`);
  });