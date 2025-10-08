Farcaster Follower Audit & Unfollow Script

This script automates the process of unfollowing Farcaster users who are flagged by a specific Dune Analytics query. The query is designed to identify accounts that may be inactive or of low quality.

⚠️ DISCLAIMER: USE AT YOUR OWN RISK ⚠️
This script performs irreversible actions on your Farcaster account. Once you unfollow a user, you must manually follow them back. The author of this script and the creator of the Dune query are not responsible for any actions taken by this script. Please review the list of FIDs carefully before confirming the unfollow action.

How It Works
 * Fetch Data from Dune: The script executes a Dune query, passing in your Farcaster FID. This query returns a list of FIDs you follow that meet its "low-quality" criteria.
 * User Confirmation: The script displays the list of FIDs and the total count, then prompts you for a final confirmation before taking any action.
 * Unfollow via Neynar: If you confirm, the script uses the Neynar API to send unfollow requests for the flagged FIDs on your behalf.
Prerequisites
 * Node.js (v18 or newer recommended)
 * A Farcaster Account
 * A Dune Analytics account with a generated API Key.
 * A Neynar account with a generated API Key and a Signer UUID.
Setup Instructions
 * Clone or Download:
   Get the script files onto your local machine.
 * Install Dependencies:
   Open your terminal in the project directory and run:
   npm install

 * Create Environment File:
   Create a file named .env in the root of the project directory. You can copy the example file:
   cp .env.example .env

 * Fill in Environment Variables:
   Open the .env file and fill in the required values:
   * DUNE_API_KEY: Your API key from your Dune Analytics account settings.
   * NEYNAR_API_KEY: Your API key from the Neynar dashboard.
   * FARCASTER_SIGNER_UUID: The Signer UUID for your Farcaster account, which you can create and find in the Neynar dashboard.
   * TARGET_FID: The Farcaster ID (FID) of the account you want to run the audit for (i.e., your own FID).
Usage
Once the setup is complete, run the script from your terminal:
npm start

The script will begin fetching data from Dune. Once it has the list of FIDs, it will print them and ask for your confirmation. Type yes and press Enter to proceed with unfollowing, or type anything else to cancel.
