const admin = require("firebase-admin");
const axios = require("axios");
const cron = require("node-cron");

// טעינת המפתחות ממשתנה סביבה (בטוח יותר ל-GitHub)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://amagen-d0d81-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const fcm = admin.messaging();
const alertImage = "https://i.ibb.co/nMP1W1t/359226.jpg";

// פונקציה לשליחת התראה
async function sendNotification(cityName) {
    const usersSnapshot = await db.collection('users')
        .where('selectedCities', 'array-contains', cityName)
        .get();

    if (usersSnapshot.empty) return;

    const tokens = [];
    usersSnapshot.forEach(doc => {
        if (doc.data().fcmToken) tokens.push(doc.data().fcmToken);
    });

    if (tokens.length === 0) return;

    const message = {
        notification: {
            title: `צבע אדום: ${cityName}`,
            body: `התרעה הופעלה ביישוב שלך. נא להיכנס למרחב המוגן.`,
            image: alertImage
        },
        tokens: tokens
    };

    try {
        await fcm.sendMulticast(message);
        console.log(`התראה נשלחה ל-${cityName}`);
    } catch (error) {
        console.error("שגיאה בשליחה:", error);
    }
}

// בדיקה כל 5 שניות מול פיקוד העורף
cron.schedule('*/5 * * * * *', async () => {
    try {
        const response = await axios.get('https://www.oref.org.il/WarningMessages/History/AlertsHistory.json');
        if (response.data && response.data.length > 0) {
            const city = response.data[0].data; // שם היישוב
            await sendNotification(city);
        }
    } catch (e) {
        console.log("ממתין להתראות חדשות...");
    }
});

console.log("השרת של אמגן פועל...");

