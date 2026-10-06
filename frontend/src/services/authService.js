import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import { config } from '../config';

// -------------------------------------------------------------
// Amazon Cognito User Pool Initialization
// -------------------------------------------------------------
let userPool = null;
if (config.isLiveAws) {
  if (config.userPoolId && config.clientId) {
    try {
      userPool = new CognitoUserPool({
        UserPoolId: config.userPoolId,
        ClientId: config.clientId
      });
    } catch (err) {
      console.error("[AWS_AUTH] Failed to initialize Cognito User Pool:", err);
    }
  } else {
    console.error("[AWS_AUTH] Live AWS mode is active but Cognito configuration is missing in .env");
  }
}

// -------------------------------------------------------------
// Local Demo Storage Helpers (Only used when in LOCAL DEMO MODE)
// -------------------------------------------------------------
const MOCK_USERS_KEY = 'serverless_chat_mock_users';
const CURRENT_SESSION_KEY = 'serverless_chat_session';

const getMockUsers = () => {
  const data = localStorage.getItem(MOCK_USERS_KEY);
  if (!data) {
    const defaults = [
      { userId: 'user-alice-101', username: 'Alice (Cloud Eng)', email: 'alice@example.com', password: 'Password123!' },
      { userId: 'user-bob-102', username: 'Bob (DevOps)', email: 'bob@example.com', password: 'Password123!' },
      { userId: 'user-charlie-103', username: 'Charlie (Architect)', email: 'charlie@example.com', password: 'Password123!' }
    ];
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const authService = {
  /**
   * Register a new user
   */
  async signUp(username, email, password) {
    if (config.isLiveAws) {
      if (!userPool) {
        throw new Error('Amazon Cognito User Pool is not configured. Check your AWS parameters.');
      }

      return new Promise((resolve, reject) => {
        const attributeList = [
          new CognitoUserAttribute({ Name: 'email', Value: email }),
          new CognitoUserAttribute({ Name: 'preferred_username', Value: username })
        ];

        userPool.signUp(email, password, attributeList, null, (err, result) => {
          if (err) {
            console.error('[AWS_COGNITO] Sign-up failed:', err);
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    }

    // LOCAL DEMO MODE
    const users = getMockUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser = {
      userId: 'user-' + Math.random().toString(36).substring(2, 9),
      username: username,
      email: email,
      password: password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { userSub: newUser.userId, userConfirmed: true };
  },

  /**
   * Confirm sign-up (Cognito verification code)
   */
  async confirmSignUp(email, code) {
    if (config.isLiveAws) {
      if (!userPool) {
        throw new Error('Cognito User Pool is not configured.');
      }

      return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
          Username: email,
          Pool: userPool
        });

        cognitoUser.confirmRegistration(code, true, (err, result) => {
          if (err) {
            console.error('[AWS_COGNITO] Confirmation failed:', err);
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    }

    return true;
  },

  /**
   * Authenticate and sign in
   */
  async signIn(email, password) {
    if (config.isLiveAws) {
      if (!userPool) {
        throw new Error('Cognito User Pool is not configured in .env. Cannot authenticate in Live AWS mode.');
      }

      return new Promise((resolve, reject) => {
        const authDetails = new AuthenticationDetails({
          Username: email,
          Password: password
        });

        const cognitoUser = new CognitoUser({
          Username: email,
          Pool: userPool
        });

        cognitoUser.authenticateUser(authDetails, {
          onSuccess: (result) => {
            const idToken = result.getIdToken().getJwtToken();
            const payload = result.getIdToken().decodePayload();
            const session = {
              userId: payload.sub,
              username: payload.preferred_username || payload['cognito:username'] || email.split('@')[0],
              email: payload.email || email,
              token: idToken,
              loginTime: new Date().toISOString()
            };
            sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
            console.log('[AWS_COGNITO] Successfully authenticated user:', session.username, 'sub:', session.userId);
            resolve(session);
          },
          onFailure: (err) => {
            console.error('[AWS_COGNITO] Authentication failed:', err);
            reject(err);
          }
        });
      });
    }

    // LOCAL DEMO MODE
    const users = getMockUsers();
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    const session = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      token: 'mock-jwt-token-' + user.userId,
      loginTime: new Date().toISOString()
    };
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  /**
   * Retrieve current active session
   */
  getCurrentUser() {
    const sessionStr = sessionStorage.getItem(CURRENT_SESSION_KEY);
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  },

  /**
   * Log out and invalidate session
   */
  signOut() {
    sessionStorage.removeItem(CURRENT_SESSION_KEY);
    if (config.isLiveAws && userPool) {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    }
  }
};
