const express = require('express');
const axios = require('axios');
const request = require('request');
require('dotenv').config();  // Load environment variables from .env file

const app = express();
const port = 3000;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const bridgecardSecretKey = process.env.BRIDGECARD_SECRET_KEY;
const bridgecardApiToken = process.env.BRIDGECARD_API_TOKEN;
const bridgecardApiUrl = process.env.BRIDGECARD_API_URL;

app.use(express.json());

// Function to fetch cardholder details from Bridgecard API
async function getCardholderDetails(cardholderId) {
  try {
    const options = {
      'method': 'GET',
      'url': `${bridgecardApiUrl}/cardholder/get_cardholder?cardholder_id=${cardholderId}`,
      'headers': {
        'token': `Bearer ${bridgecardApiToken}`
      }
    };
    
    const response = await axios(options);
    //console.log('API Response:', response.data); // Log the API response
    
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(`Failed to fetch cardholder details: ${response.data.message}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      console.log(`Rate limited by Bridgecard. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return getCardholderDetails(cardholderId); // Retry the request
    } else {
      throw error;
    }
  }
}

// Function to send a message to Discord with rate limiting handling
async function sendToDiscord(discordMessage) {
  try {
    await axios.post(discordWebhookUrl, discordMessage);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      console.log(`Rate limited by Discord. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendToDiscord(discordMessage); // Retry the request
    } else {
      throw error;
    }
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    const { cardholder_id, amount } = data;

    // Convert amount from cents to dollars
    const amountInDollars = (amount / 100).toFixed(2);

    // Fetch cardholder details
    const cardholderDetails = await getCardholderDetails(cardholder_id);

    // Check if cardholderDetails is valid
    if (!cardholderDetails) {
      throw new Error('Cardholder details are not available');
    }

    // Extract necessary details
    const { first_name, last_name, email_address, phone } = cardholderDetails;

    // Customize the message content for Discord
    const discordMessage = {
      content: `New Event: ${event}\nDetails: ${JSON.stringify(data, null, 2)}\n\nAmount: $${amountInDollars}\n\nUser Details:\nName: ${first_name} ${last_name}\nEmail: ${email_address}\nPhone: ${phone}`
    };

    // Send the message to Discord with rate limiting handling
    await sendToDiscord(discordMessage);

    res.status(200).send('Webhook received and forwarded to Discord');
  } catch (error) {
    console.error('Error forwarding webhook to Discord:', error.message);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(port, () => {
  console.log(`Webhook relay server listening at http://localhost:${port}`);
  //
});
