// src/config.js  Import these in app.js file when used. Ex. import { appId, firebaseConfig, initialAuthToken } from './config';

const appId = process.env.REACT_APP_APP_ID || "PLACEHOLDER_APP_ID";
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG
  ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
  : {
      apiKey: "PLACEHOLDER_API_KEY",
      authDomain: "PLACEHOLDER_AUTH_DOMAIN",
      // ...other config properties
    };
const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || "PLACEHOLDER_AUTH_TOKEN";
