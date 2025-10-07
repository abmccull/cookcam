if nslookup api.cookcam.ai 8.8.8.8 | grep -q "64.23.236.43"; then echo "✅ DNS propagated! Ready for Lets Encrypt"; else echo "⏳ DNS not propagated yet. Try again in 5-10 minutes."; fi
