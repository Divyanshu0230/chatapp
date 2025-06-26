#!/bin/bash

echo "🚀 ChatFlow Pro - Quick Deployment"
echo "=================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git is installed"

# Initialize git repository if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
    echo "✅ Git repository initialized"
fi

echo ""
echo "🌐 QUICK DEPLOYMENT LINKS:"
echo "=========================="
echo ""

echo "📋 Step 1: GitHub Repository"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: chatapp-pro"
echo "3. Make it: Public"
echo "4. Don't initialize with README"
echo "5. Click 'Create repository'"
echo "6. Copy the repository URL"
echo ""

read -p "Enter your GitHub repository URL: " github_url

if [ -n "$github_url" ]; then
    git remote add origin "$github_url"
    git push -u origin main
    echo "✅ Code pushed to GitHub"
fi

echo ""
echo "🗄️  Step 2: MongoDB Atlas (Database)"
echo "1. Go to: https://www.mongodb.com/atlas"
echo "2. Sign up/Login"
echo "3. Create new project"
echo "4. Build database (FREE tier)"
echo "5. Create database user"
echo "6. Allow network access (0.0.0.0/0)"
echo "7. Get connection string"
echo ""

read -p "Enter your MongoDB connection string: " mongodb_uri

echo ""
echo "🚀 Step 3: Render (Backend)"
echo "1. Go to: https://render.com"
echo "2. Sign up/Login with GitHub"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect your GitHub repository"
echo "5. Configure:"
echo "   - Name: chatapp-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: gunicorn app:app"
echo "6. Add Environment Variables:"
echo "   - MONGODB_URI: $mongodb_uri"
echo "   - SECRET_KEY: your-super-secret-key-here"
echo "7. Click 'Create Web Service'"
echo ""

read -p "Enter your Render service URL: " render_url

echo ""
echo "🌐 Step 4: Vercel (Frontend)"
echo "1. Go to: https://vercel.com"
echo "2. Sign up/Login with GitHub"
echo "3. Click 'New Project'"
echo "4. Import your GitHub repository"
echo "5. Configure:"
echo "   - Framework Preset: Other"
echo "   - Build Command: (leave empty)"
echo "   - Output Directory: (leave empty)"
echo "6. Add Environment Variable:"
echo "   - NEXT_PUBLIC_API_URL: $render_url"
echo "7. Click 'Deploy'"
echo ""

read -p "Enter your Vercel deployment URL: " vercel_url

echo ""
echo "⚙️  Updating configurations..."

# Update frontend API URL
if [ -n "$render_url" ]; then
    sed -i.bak "s|https://your-backend-domain.onrender.com|$render_url|g" static/chat-app.js
    echo "✅ Frontend API URL updated"
fi

# Update backend CORS
if [ -n "$vercel_url" ]; then
    sed -i.bak "s|https://your-frontend-domain.vercel.app|$vercel_url|g" app.py
    echo "✅ Backend CORS updated"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "📍 Your Deployment Links:"
echo "Frontend (Vercel): $vercel_url"
echo "Backend (Render): $render_url"
echo "Database (MongoDB Atlas): Configured"
echo ""
echo "🔧 Environment Variables:"
echo ""
echo "Render Environment Variables:"
echo "MONGODB_URI=$mongodb_uri"
echo "SECRET_KEY=your-super-secret-key-here"
echo "FRONTEND_URL=$vercel_url"
echo ""
echo "Vercel Environment Variables:"
echo "NEXT_PUBLIC_API_URL=$render_url"
echo ""
echo "📊 Monitoring:"
echo "Render Dashboard: https://dashboard.render.com"
echo "Vercel Dashboard: https://vercel.com/dashboard"
echo "MongoDB Atlas: https://cloud.mongodb.com"
echo ""
echo "🚀 Next Steps:"
echo "1. Test your app: $vercel_url"
echo "2. Monitor deployments in dashboards"
echo "3. Set up custom domains (optional)"
echo ""

# Create deployment summary
cat > DEPLOYMENT_SUMMARY.md << EOF
# 🎉 ChatFlow Pro - Deployment Complete!

## 📍 Your Deployment Links:

### Frontend (Vercel):
$vercel_url

### Backend API (Render):
$render_url

### Database (MongoDB Atlas):
$mongodb_uri

## 🔧 Environment Variables:

### Render Environment Variables:
\`\`\`
MONGODB_URI=$mongodb_uri
SECRET_KEY=your-super-secret-key-here
FRONTEND_URL=$vercel_url
\`\`\`

### Vercel Environment Variables:
\`\`\`
NEXT_PUBLIC_API_URL=$render_url
\`\`\`

## 🚀 Next Steps:

1. **Test your app**: Visit $vercel_url
2. **Monitor deployments**: Check Render and Vercel dashboards
3. **Set up custom domains** (optional)
4. **Configure monitoring** and alerts

## 📊 Monitoring URLs:

- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com

---
Generated on: $(date)
EOF

echo "✅ Deployment summary created: DEPLOYMENT_SUMMARY.md"

# Open deployment links in browser
if command -v open &> /dev/null; then
    if [ -n "$vercel_url" ]; then
        open "$vercel_url"
        echo "✅ Opened frontend in browser"
    fi
    if [ -n "$render_url" ]; then
        open "$render_url"
        echo "✅ Opened backend in browser"
    fi
elif command -v xdg-open &> /dev/null; then
    if [ -n "$vercel_url" ]; then
        xdg-open "$vercel_url"
        echo "✅ Opened frontend in browser"
    fi
    if [ -n "$render_url" ]; then
        xdg-open "$render_url"
        echo "✅ Opened backend in browser"
    fi
fi

echo ""
echo "🎯 Your chat app is now live!"
echo "Share the frontend URL with friends: $vercel_url" 