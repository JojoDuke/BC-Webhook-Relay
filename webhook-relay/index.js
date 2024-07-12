const express = require('express');
const axios = require('axios');
const request = require('request');
require('dotenv').config();

const app = express();
const port = 3000;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const bridgecardSecretKey = process.env.BRIDGECARD_SECRET_KEY;
const bridgecardApiToken = process.env.BRIDGECARD_API_TOKEN;
const bridgecardApiUrl = process.env.BRIDGECARD_API_URL;

app.use(express.json());

// Function to fetch cardholder details from Bridgecard API
function getCardholderDetails(cardholderId) {
  return new Promise((resolve, reject) => {
    var options = {
      'method': 'GET',
      'url': `${bridgecardApiUrl}/cardholder/get_cardholder?cardholder_id=${cardholderId}`,
      'headers': {
        'token': `Bearer ${bridgecardApiToken}`
      }
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      } else {
        try {
          const responseBody = JSON.parse(response.body);
          //console.log('API Response:', responseBody);
          if (responseBody.status === 'success') {
            resolve(responseBody.data);
          } else {
            reject(new Error(`Failed to fetch cardholder details: ${responseBody.message}`));
          }
        } catch (e) {
          reject(new Error('Error parsing cardholder details response'));
        }
      }
    });
  });
}

app.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    const { cardholder_id, amount } = data;

    // Fetch cardholder details
    const cardholderDetails = await getCardholderDetails(cardholder_id);
    const amountInDollars = (amount / 100).toFixed(2);

    // Check if cardholderDetails is valid
    if (!cardholderDetails) {
      throw new Error('Cardholder details are not available');
    }

    // Extract necessary details
    const { first_name, last_name, email_address, phone } = cardholderDetails;

    // Customize the message content for Discord
    const discordMessage = {
      content: `New Event: ${event}\nDetails: ${JSON.stringify(data, null, 2)}\n\nAmount: $${amountInDollars}\nUser Details:\nName: ${first_name} ${last_name}\nEmail: ${email_address}\nPhone: ${phone}`
    };

    // Send the message to Discord
    await axios.post(discordWebhookUrl, discordMessage);

    res.status(200).send('Webhook received and forwarded to Discord');
  } catch (error) {
    console.error('Error forwarding webhook to Discord:', error.message);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(port, async () => {
  console.log(`Webhook relay server listening at http://localhost:${port}`);

  //const cardholderDetails = await getCardholderDetails("2695a75f24784a288ffb9a0e6821aa01");
  //console.log('Cardholder Details:', cardholderDetails.address);
});
