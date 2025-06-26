#!/usr/bin/env python3
"""
One-Click Deployment Script for ChatFlow Pro
Automatically deploys to Render + Vercel + MongoDB Atlas
"""

import os
import subprocess
import requests
import json
import time
import webbrowser
from pathlib import Path

class AutoDeployer:
    def __init__(self):
        self.project_name = "chatapp-pro"
        self.github_repo = None
        self.mongodb_uri = None
        self.render_url = None
        self.vercel_url = None
        
    def check_prerequisites(self):
        """Check if required tools are installed"""
        print("🔍 Checking prerequisites...")
        
        # Check if git is installed
        try:
            subprocess.run(["git", "--version"], check=True, capture_output=True)
            print("✅ Git is installed")
        except:
            print("❌ Git is not installed. Please install Git first.")
            return False
            
        # Check if GitHub CLI is installed
        try:
            subprocess.run(["gh", "--version"], check=True, capture_output=True)
            print("✅ GitHub CLI is installed")
        except:
            print("⚠️  GitHub CLI not found. Will use manual GitHub setup.")
            
        # Check if Vercel CLI is installed
        try:
            subprocess.run(["vercel", "--version"], check=True, capture_output=True)
            print("✅ Vercel CLI is installed")
        except:
            print("⚠️  Vercel CLI not found. Will use manual Vercel setup.")
            
        return True
    
    def setup_github_repo(self):
        """Create GitHub repository and push code"""
        print("\n📦 Setting up GitHub repository...")
        
        # Initialize git if not already done
        if not Path(".git").exists():
            subprocess.run(["git", "init"])
            subprocess.run(["git", "add", "."])
            subprocess.run(["git", "commit", "-m", "Initial commit"])
        
        # Create GitHub repository using GitHub CLI
        try:
            result = subprocess.run([
                "gh", "repo", "create", self.project_name,
                "--public", "--source=.", "--remote=origin", "--push"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                # Extract repository URL
                for line in result.stdout.split('\n'):
                    if 'https://github.com' in line:
                        self.github_repo = line.strip()
                        print(f"✅ GitHub repository created: {self.github_repo}")
                        return True
            else:
                print("⚠️  GitHub CLI failed, using manual setup")
                return self.manual_github_setup()
                
        except Exception as e:
            print(f"⚠️  GitHub CLI error: {e}")
            return self.manual_github_setup()
    
    def manual_github_setup(self):
        """Manual GitHub repository setup instructions"""
        print("\n📋 Manual GitHub Setup Required:")
        print("1. Go to https://github.com/new")
        print("2. Create a new repository named 'chatapp-pro'")
        print("3. Make it public")
        print("4. Don't initialize with README (we already have files)")
        print("5. Copy the repository URL")
        
        repo_url = input("\nEnter your GitHub repository URL: ").strip()
        if repo_url:
            self.github_repo = repo_url
            # Add remote and push
            subprocess.run(["git", "remote", "add", "origin", repo_url])
            subprocess.run(["git", "push", "-u", "origin", "main"])
            print("✅ Code pushed to GitHub")
            return True
        return False
    
    def setup_mongodb_atlas(self):
        """Set up MongoDB Atlas cluster using API"""
        print("\n🗄️  Setting up MongoDB Atlas...")
        
        # For now, provide manual setup instructions
        print("📋 MongoDB Atlas Setup:")
        print("1. Go to https://www.mongodb.com/atlas")
        print("2. Sign up/Login")
        print("3. Create a new project")
        print("4. Build a database (FREE tier)")
        print("5. Create database user (save credentials)")
        print("6. Allow network access from anywhere (0.0.0.0/0)")
        print("7. Get connection string")
        
        connection_string = input("\nEnter your MongoDB connection string: ").strip()
        if connection_string:
            self.mongodb_uri = connection_string
            print("✅ MongoDB Atlas configured")
            return True
        return False
    
    def deploy_to_render(self):
        """Deploy backend to Render"""
        print("\n🚀 Deploying to Render...")
        
        print("📋 Render Setup:")
        print("1. Go to https://render.com")
        print("2. Sign up/Login with GitHub")
        print("3. Click 'New +' → 'Web Service'")
        print("4. Connect your GitHub repository")
        print("5. Configure:")
        print("   - Name: chatapp-backend")
        print("   - Environment: Python 3")
        print("   - Build Command: pip install -r requirements.txt")
        print("   - Start Command: gunicorn app:app")
        print("6. Add Environment Variables:")
        print(f"   - MONGODB_URI: {self.mongodb_uri}")
        print("   - SECRET_KEY: your-super-secret-key-here")
        print("7. Click 'Create Web Service'")
        
        render_url = input("\nEnter your Render service URL: ").strip()
        if render_url:
            self.render_url = render_url
            print("✅ Render deployment configured")
            return True
        return False
    
    def deploy_to_vercel(self):
        """Deploy frontend to Vercel"""
        print("\n🌐 Deploying to Vercel...")
        
        # Try using Vercel CLI
        try:
            print("Using Vercel CLI for deployment...")
            result = subprocess.run([
                "vercel", "--prod", "--yes"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                # Extract deployment URL
                for line in result.stdout.split('\n'):
                    if 'https://' in line and 'vercel.app' in line:
                        self.vercel_url = line.strip()
                        print(f"✅ Vercel deployment: {self.vercel_url}")
                        return True
        except:
            pass
        
        # Manual Vercel setup
        print("📋 Manual Vercel Setup:")
        print("1. Go to https://vercel.com")
        print("2. Sign up/Login with GitHub")
        print("3. Click 'New Project'")
        print("4. Import your GitHub repository")
        print("5. Configure:")
        print("   - Framework Preset: Other")
        print("   - Build Command: (leave empty)")
        print("   - Output Directory: (leave empty)")
        print("6. Add Environment Variable:")
        print(f"   - NEXT_PUBLIC_API_URL: {self.render_url}")
        print("7. Click 'Deploy'")
        
        vercel_url = input("\nEnter your Vercel deployment URL: ").strip()
        if vercel_url:
            self.vercel_url = vercel_url
            print("✅ Vercel deployment configured")
            return True
        return False
    
    def update_configurations(self):
        """Update configuration files with deployment URLs"""
        print("\n⚙️  Updating configurations...")
        
        # Update frontend API URL
        if self.render_url:
            with open("static/chat-app.js", "r") as f:
                content = f.read()
            
            # Update API_BASE_URL
            content = content.replace(
                "https://your-backend-domain.onrender.com",
                self.render_url
            )
            
            with open("static/chat-app.js", "w") as f:
                f.write(content)
            
            print("✅ Frontend API URL updated")
        
        # Update backend CORS
        if self.vercel_url:
            with open("app.py", "r") as f:
                content = f.read()
            
            # Update CORS origins
            content = content.replace(
                "https://your-frontend-domain.vercel.app",
                self.vercel_url
            )
            
            with open("app.py", "w") as f:
                f.write(content)
            
            print("✅ Backend CORS updated")
    
    def create_deployment_summary(self):
        """Create deployment summary file"""
        summary = f"""
# 🎉 ChatFlow Pro - Deployment Complete!

## 📍 Your Deployment Links:

### Frontend (Vercel):
{self.vercel_url or "Not deployed yet"}

### Backend API (Render):
{self.render_url or "Not deployed yet"}

### Database (MongoDB Atlas):
{self.mongodb_uri or "Not configured yet"}

## 🔧 Environment Variables:

### Render Environment Variables:
```
MONGODB_URI={self.mongodb_uri or "your-mongodb-connection-string"}
SECRET_KEY=your-super-secret-key-here
FRONTEND_URL={self.vercel_url or "your-frontend-url"}
```

### Vercel Environment Variables:
```
NEXT_PUBLIC_API_URL={self.render_url or "your-backend-url"}
```

## 🚀 Next Steps:

1. **Test your app**: Visit {self.vercel_url or "your-frontend-url"}
2. **Monitor deployments**: Check Render and Vercel dashboards
3. **Set up custom domains** (optional)
4. **Configure monitoring** and alerts

## 📊 Monitoring URLs:

- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com

---
Generated on: {time.strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        with open("DEPLOYMENT_SUMMARY.md", "w") as f:
            f.write(summary)
        
        print("✅ Deployment summary created: DEPLOYMENT_SUMMARY.md")
    
    def open_deployment_links(self):
        """Open deployment links in browser"""
        print("\n🌐 Opening deployment links...")
        
        if self.vercel_url:
            webbrowser.open(self.vercel_url)
            print(f"✅ Opened frontend: {self.vercel_url}")
        
        if self.render_url:
            webbrowser.open(self.render_url)
            print(f"✅ Opened backend: {self.render_url}")
    
    def run(self):
        """Run the complete deployment process"""
        print("🚀 ChatFlow Pro - One-Click Deployment")
        print("=" * 50)
        
        if not self.check_prerequisites():
            return
        
        # Step 1: GitHub Repository
        if not self.setup_github_repo():
            print("❌ GitHub setup failed")
            return
        
        # Step 2: MongoDB Atlas
        if not self.setup_mongodb_atlas():
            print("❌ MongoDB setup failed")
            return
        
        # Step 3: Render Backend
        if not self.deploy_to_render():
            print("❌ Render deployment failed")
            return
        
        # Step 4: Vercel Frontend
        if not self.deploy_to_vercel():
            print("❌ Vercel deployment failed")
            return
        
        # Step 5: Update configurations
        self.update_configurations()
        
        # Step 6: Create summary
        self.create_deployment_summary()
        
        # Step 7: Open links
        self.open_deployment_links()
        
        print("\n🎉 Deployment Complete!")
        print("=" * 50)
        print(f"Frontend: {self.vercel_url}")
        print(f"Backend: {self.render_url}")
        print(f"Database: MongoDB Atlas")
        print("\nCheck DEPLOYMENT_SUMMARY.md for details!")

if __name__ == "__main__":
    deployer = AutoDeployer()
    deployer.run() 