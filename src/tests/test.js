const assert = require('assert');
const PosterAPI = require('../posterApiWrapper').default;

// instance of PosterApiWrapper, i think this is what it should look like
const api = new PosterAPI({
  baseURL: 'https://api.poster-social.com', 
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM0OTI3MjIzLTY5OTAtNDIwMC1iYTg0LTZiNTI1ZDAwNzI2MyIsInVzZXJuYW1lIjoiMHhyeWFuIiwiZW1haWwiOiJyeWFuYW50aG9ueXNoZXJpZGFuQGdtYWlsLmNvbSIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc0MDE2MDA4OSwiZXhwIjoxNzQwMjQ2NDg5fQ.4-t-vD1R775M4QSIqZG6kD3qCF6W-q_YOEtjz3kvQFo'
});

(async () => {
  try {
    let profileResponse;
    
    profileResponse = await api.getUserProfile('0xryan', { cacheTTL: 30000 });
    profileResponse = await api.getUserProfile('0xryan', { cacheTTL: 30000 });

    console.log('[*] get profile response:', profileResponse);

    // make sure theres a user property in the profile response
    assert(profileResponse.user, "[-] expected a 'user' property in the response");
    console.log('[+] test passed');

    // more tests
    // ...

  } catch (error) {
    console.error('[-] test failed:', error);
    process.exit(1);
  }
})();
