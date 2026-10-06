# BFLIX
1. ارفع الملفات إلى GitHub Pages (main / root).
2. أنشئ معرّف عميل Google: Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   - Authorized JavaScript origins: https://omeriane18-ui.github.io
   - شاشة الموافقة (OAuth consent screen): External، ثم اضغط Publish app حتى يدخل أي مستخدم.
3. الصق المعرّف في config.js.
4. Firebase > Firestore > Rules: الصق firestore.rules ثم Publish.
5. لوحة التحكم: /admin.html (بريد وكلمة مرور Firebase).
