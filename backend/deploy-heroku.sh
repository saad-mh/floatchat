#!/bin/bash

# FloatChat - Interactive Heroku Deployment Script

echo "🚀 FloatChat - Heroku Deployment"
echo "================================"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed!"
    echo "   Installing now..."
    curl https://cli-assets.heroku.com/install.sh | sh
fi

echo "✅ Heroku CLI installed"
echo ""

# Check if logged in
echo "Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "Please login to Heroku:"
    heroku login
    echo ""
    echo "Please login to Heroku Container Registry:"
    heroku container:login
else
    echo "✅ Already logged in as: $(heroku auth:whoami)"
    heroku container:login
fi

echo ""
echo "================================"
echo "App Configuration"
echo "================================"
echo ""

# Ask for app name
read -p "Enter your Heroku app name (or press Enter to auto-generate): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo ""
    echo "Creating app with auto-generated name..."
    APP_NAME=$(heroku create --json | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo "✅ Created app: $APP_NAME"
else
    echo ""
    echo "Creating app: $APP_NAME..."
    if heroku create $APP_NAME; then
        echo "✅ Created app: $APP_NAME"
    else
        echo "❌ Failed to create app. Name might be taken."
        echo "   Try a different name or let Heroku auto-generate one."
        exit 1
    fi
fi

echo ""
echo "================================"
echo "Setting Environment Variables"
echo "================================"
echo ""

# Read from .env file
if [ -f .env ]; then
    echo "Setting environment variables from .env file..."
    
    # Extract values from .env
    SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2)
    SUPABASE_KEY=$(grep "^SUPABASE_KEY=" .env | cut -d'=' -f2)
    UPSTASH_VECTOR_REST_URL=$(grep "^UPSTASH_VECTOR_REST_URL=" .env | cut -d'=' -f2)
    UPSTASH_VECTOR_REST_TOKEN=$(grep "^UPSTASH_VECTOR_REST_TOKEN=" .env | cut -d'=' -f2)
    HUGGINGFACE_API_TOKEN=$(grep "^HUGGINGFACE_API_TOKEN=" .env | cut -d'=' -f2)
    HISTORY_SUPABASE_URL=$(grep "^HISTORY_SUPABASE_URL=" .env | cut -d'=' -f2)
    HISTORY_SUPABASE_KEY=$(grep "^HISTORY_SUPABASE_KEY=" .env | cut -d'=' -f2)
    
    # Set config vars
    heroku config:set SUPABASE_URL="$SUPABASE_URL" -a $APP_NAME
    heroku config:set SUPABASE_KEY="$SUPABASE_KEY" -a $APP_NAME
    heroku config:set UPSTASH_VECTOR_REST_URL="$UPSTASH_VECTOR_REST_URL" -a $APP_NAME
    heroku config:set UPSTASH_VECTOR_REST_TOKEN="$UPSTASH_VECTOR_REST_TOKEN" -a $APP_NAME
    heroku config:set HUGGINGFACE_API_TOKEN="$HUGGINGFACE_API_TOKEN" -a $APP_NAME
    
    if [ ! -z "$HISTORY_SUPABASE_URL" ]; then
        heroku config:set HISTORY_SUPABASE_URL="$HISTORY_SUPABASE_URL" -a $APP_NAME
        heroku config:set HISTORY_SUPABASE_KEY="$HISTORY_SUPABASE_KEY" -a $APP_NAME
    fi
    
    echo "✅ Environment variables set"
else
    echo "⚠️  .env file not found!"
    echo "   You'll need to set environment variables manually:"
    echo "   heroku config:set SUPABASE_URL=... -a $APP_NAME"
fi

echo ""
echo "================================"
echo "Deploying Docker Image"
echo "================================"
echo ""

echo "📦 Building and pushing Docker image to Heroku..."
echo "   This will take 5-10 minutes..."
echo ""

if heroku container:push web -a $APP_NAME; then
    echo ""
    echo "✅ Docker image pushed successfully!"
    echo ""
    echo "🚀 Releasing to production..."
    
    if heroku container:release web -a $APP_NAME; then
        echo ""
        echo "================================"
        echo "✅ DEPLOYMENT SUCCESSFUL!"
        echo "================================"
        echo ""
        echo "🌐 Your app is live at:"
        echo "   https://$APP_NAME.herokuapp.com"
        echo ""
        echo "🧪 Test your API:"
        echo "   curl https://$APP_NAME.herokuapp.com/health"
        echo ""
        echo "📊 View logs:"
        echo "   heroku logs --tail -a $APP_NAME"
        echo ""
        echo "🌐 Open in browser:"
        echo "   heroku open -a $APP_NAME"
        echo ""
        echo "📝 Update your frontend .env.local:"
        echo "   NEXT_PUBLIC_API_URL=https://$APP_NAME.herokuapp.com"
        echo ""
        
        # Ask if user wants to open the app
        read -p "Open app in browser? (y/n): " OPEN_APP
        if [ "$OPEN_APP" = "y" ] || [ "$OPEN_APP" = "Y" ]; then
            heroku open -a $APP_NAME
        fi
        
        # Ask if user wants to view logs
        read -p "View logs? (y/n): " VIEW_LOGS
        if [ "$VIEW_LOGS" = "y" ] || [ "$VIEW_LOGS" = "Y" ]; then
            heroku logs --tail -a $APP_NAME
        fi
    else
        echo ""
        echo "❌ Release failed!"
        echo "   Check logs: heroku logs --tail -a $APP_NAME"
        exit 1
    fi
else
    echo ""
    echo "❌ Docker push failed!"
    echo "   Check logs: heroku logs --tail -a $APP_NAME"
    exit 1
fi
