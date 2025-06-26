# 🚀 Deployment Guide: Render + Vercel + MongoDB Atlas

This guide will help you deploy your ChatFlow Pro app using the modern three-tier architecture:

- **Backend API**: Render (Flask)
- **Frontend**: Vercel (Static files)
- **Database**: MongoDB Atlas

## 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Render Account** - For backend hosting
3. **Vercel Account** - For frontend hosting
4. **MongoDB Atlas Account** - For database

## 🗄️ Step 1: Set Up MongoDB Atlas

### 1.1 Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up/Login and create a new project
3. Click "Build a Database"
4. Choose "FREE" tier (M0)
5. Select your preferred cloud provider and region
6. Click "Create"

### 1.2 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Create a username and password (save these!)
4. Select "Read and write to any database"
5. Click "Add User"

### 1.3 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 1.4 Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `chatapp`

**Example connection string:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```

## 🔧 Step 2: Deploy Backend to Render

### 2.1 Prepare Your Repository
1. Push your code to GitHub
2. Make sure you have these files in your repo:
   - `app.py` (Flask API)
   - `requirements.txt`
   - `Procfile`

### 2.2 Create Render Service
1. Go to [Render](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:

**Basic Settings:**
- **Name**: `chatapp-backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app`

**Environment Variables:**
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
SECRET_KEY=your-super-secret-key-here
```

### 2.3 Deploy
1. Click "Create Web Service"
2. Wait for the build to complete
3. Copy your service URL (e.g., `https://chatapp-backend.onrender.com`)

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Configuration
1. In your `static/chat-app.js`, update the API URL:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5050' 
    : 'https://your-backend-domain.onrender.com'; // Your Render URL
```

2. Update all fetch calls to use `API_BASE_URL`:

```javascript
// Instead of: fetch('/send_message', ...)
// Use: fetch(`${API_BASE_URL}/send_message`, ...)
```

### 3.2 Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:

**Build Settings:**
- **Framework Preset**: Other
- **Build Command**: Leave empty
- **Output Directory**: Leave empty
- **Install Command**: Leave empty

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
```

### 3.3 Configure Vercel
1. Create a `vercel.json` file in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "static/**/*",
      "use": "@vercel/static"
    },
    {
      "src": "templates/index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/templates/index.html"
    }
  ]
}
```

2. Deploy the project
3. Copy your Vercel domain (e.g., `https://chatapp-frontend.vercel.app`)

## 🔗 Step 4: Connect Everything

### 4.1 Update CORS in Backend
1. Go back to your Render service
2. Update the environment variable:

```
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

3. Update your `app.py` CORS configuration:

```python
CORS(app, origins=[
    "http://localhost:3000",
    "https://your-frontend-domain.vercel.app",
    "https://*.vercel.app"
], supports_credentials=True)
```

### 4.2 Test the Connection
1. Visit your Vercel frontend URL
2. Try to register/login
3. Test sending messages
4. Check if everything works

## 🔧 Step 5: Environment Variables Summary

### Render (Backend) Environment Variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
SECRET_KEY=your-super-secret-key-here
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Vercel (Frontend) Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
```

## 🚀 Step 6: Custom Domains (Optional)

### 6.1 Custom Domain for Frontend
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

### 6.2 Custom Domain for Backend
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your custom domain
4. Configure DNS records

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check if frontend URL is in CORS origins
   - Ensure `supports_credentials=True`

2. **MongoDB Connection Issues**
   - Verify connection string format
   - Check network access settings
   - Ensure database user has correct permissions

3. **API Calls Failing**
   - Verify API_BASE_URL is correct
   - Check if backend is running
   - Review browser console for errors

4. **Build Failures**
   - Check `requirements.txt` for all dependencies
   - Verify Python version compatibility
   - Review build logs for specific errors

## 📊 Monitoring

### Render Monitoring:
- View logs in Render dashboard
- Monitor service health
- Check resource usage

### Vercel Monitoring:
- View deployment status
- Monitor performance
- Check analytics

### MongoDB Atlas Monitoring:
- Monitor database performance
- Check connection metrics
- Review query performance

## 🔄 Updates and Maintenance

### Updating Backend:
1. Push changes to GitHub
2. Render will auto-deploy
3. Monitor deployment logs

### Updating Frontend:
1. Push changes to GitHub
2. Vercel will auto-deploy
3. Check deployment status

### Database Maintenance:
1. Monitor MongoDB Atlas dashboard
2. Set up alerts for performance issues
3. Regular backup verification

## 🎉 Success!

Your ChatFlow Pro app is now deployed with:
- ✅ Scalable backend on Render
- ✅ Fast frontend on Vercel
- ✅ Reliable database on MongoDB Atlas
- ✅ Auto-deployment from GitHub
- ✅ Custom domains (optional)

**Your app URLs:**
- Frontend: `https://your-frontend-domain.vercel.app`
- Backend: `https://your-backend-domain.onrender.com`
- Database: MongoDB Atlas (managed)

---

**Need help?** Check the troubleshooting section or create an issue in your repository! 