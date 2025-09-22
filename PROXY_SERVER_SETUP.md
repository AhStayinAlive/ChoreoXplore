# Lyrics Proxy Server Setup

## 🎵 **What This Solves**

The proxy server solves CORS issues by running a backend server that:
- Fetches lyrics from multiple APIs
- Returns them to your React app
- Avoids browser CORS restrictions

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Start the Proxy Server**
```bash
npm run server
```

### **3. Start the React App** (in a new terminal)
```bash
npm run dev
```

## 🔧 **How It Works**

1. **React App** → Makes request to `http://localhost:3001/api/lyrics`
2. **Proxy Server** → Tries multiple lyrics APIs:
   - Lyrics.ovh
   - Some Random API
   - Lyrify API
3. **Proxy Server** → Returns lyrics to React app
4. **React App** → Displays lyrics and runs AI analysis

## 📡 **API Endpoints**

### **Get Lyrics**
```
GET http://localhost:3001/api/lyrics?artist=Artist&title=Song
```

**Example:**
```
GET http://localhost:3001/api/lyrics?artist=Coldplay&title=Yellow
```

**Response:**
```json
{
  "success": true,
  "lyrics": "Look at the stars...",
  "source": "Lyrics.ovh",
  "artist": "Coldplay",
  "title": "Yellow"
}
```

### **Health Check**
```
GET http://localhost:3001/health
```

## 🛠️ **Server Features**

- **Multiple API Fallbacks**: Tries 3 different lyrics APIs
- **CORS Enabled**: Works with React app
- **Error Handling**: Graceful fallbacks
- **Logging**: Console output for debugging
- **Timeout Protection**: 10-second timeouts

## 🧪 **Testing**

1. **Start the server**: `npm run server`
2. **Test health**: Visit `http://localhost:3001/health`
3. **Test lyrics**: Visit `http://localhost:3001/api/lyrics?artist=Coldplay&title=Yellow`
4. **Use in app**: Search for "Yellow" by "Coldplay" in the React app

## 🔧 **Troubleshooting**

### **Server Won't Start**
- Check if port 3001 is available
- Make sure dependencies are installed: `npm install`

### **No Lyrics Found**
- Check server console for API errors
- Try different song/artist combinations
- Verify APIs are working by visiting them directly

### **CORS Errors**
- Make sure proxy server is running on port 3001
- Check that React app is making requests to `localhost:3001`

## 📝 **Server Logs**

The server will show:
- Which API it's trying
- Success/failure messages
- Error details
- Request information

## 🎯 **Benefits**

- **No CORS Issues**: Server-side requests bypass browser restrictions
- **Multiple APIs**: Higher success rate with fallbacks
- **Reliable**: Works consistently
- **Fast**: Direct API calls from server
- **Debuggable**: Clear logging and error messages

---

**Ready to use!** Start the server and enjoy reliable lyrics search! 🎉
