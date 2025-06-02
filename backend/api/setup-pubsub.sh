#!/bin/bash

# CookCam Google Play RTDN Setup Script
echo "🚀 Setting up Google Play Real-time Developer Notifications..."

# Set project variables
PROJECT_ID="swapster-325318"
TOPIC_NAME="cookcam-rtdn-topic"
SUBSCRIPTION_NAME="cookcam-rtdn-subscription"
SERVICE_ACCOUNT="cookcamai@swapster-325318.iam.gserviceaccount.com"

# Set the project
echo "📋 Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Create the Pub/Sub topic
echo "📨 Creating Pub/Sub topic: $TOPIC_NAME"
gcloud pubsub topics create $TOPIC_NAME

# Create a subscription for testing
echo "📬 Creating subscription: $SUBSCRIPTION_NAME"
gcloud pubsub subscriptions create $SUBSCRIPTION_NAME --topic=$TOPIC_NAME

# Grant the service account necessary permissions
echo "🔐 Setting up service account permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/pubsub.viewer"

# Grant Google Play permission to publish to the topic
echo "🎮 Granting Google Play permission to publish..."
gcloud pubsub topics add-iam-policy-binding $TOPIC_NAME \
    --member="serviceAccount:google-play-developer-notifications@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher"

echo "✅ Setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   Project ID: $PROJECT_ID"
echo "   Topic Name: $TOPIC_NAME"
echo "   Full Topic Path: projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo ""
echo "🔗 Use this topic path in Google Play Console:"
echo "   projects/swapster-325318/topics/cookcam-rtdn-topic"
echo ""
echo "📱 Your webhook endpoint URL should be:"
echo "   https://your-api-domain.com/api/v1/subscription/webhook/google" 