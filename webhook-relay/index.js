const express = require('express');
const axios = require('axios');
const request = require('request');

const app = express();
const port = process.env.PORT || 3000;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const bridgecardSecretKey = process.env.BRIDGECARD_SECRET_KEY;
const bridgecardApiToken = process.env.BRIDGECARD_API_TOKEN;
const bridgecardApiUrl = process.env.BRIDGECARD_API_URL;

app.use(express.json());

// Function to fetch cardholder details from Bridgecard API
function getCardholderDetails(cardholderId) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'GET',
      url: `${bridgecardApiUrl}/cardholder/get_cardholder?cardholder_id=${cardholderId}`,
      headers: {
        'Authorization': `Bearer ${bridgecardApiToken}`
      }
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(response.body));
      }
    });
  });
}

app.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    const { cardholder_id } = data;

    // Fetch cardholder details
    const cardholderDetails = await getCardholderDetails(cardholder_id);

    // Extract necessary details
    const { first_name, last_name, email_address, phone } = cardholderDetails.data;

    // Customize the message content for Discord
    const discordMessage = {
      content: `New Event: ${event}\nDetails: ${JSON.stringify(data, null, 2)}\n\nUser Details:\nName: ${first_name} ${last_name}\nEmail: ${email_address}\nPhone: ${phone}`
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
