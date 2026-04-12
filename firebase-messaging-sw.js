importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCwSslQTAW-asN0F48MHGiy3i0Hjtz4uhA",
    projectId: "neonvoid-744c1",
    messagingSenderId: "917731436169",
    appId: "1:917731436169:web:c92cc82dfbefe4de478858"
});

const messaging = firebase.messaging();
