const assert = require('assert');
const PosterAPI = require('../posterApiWrapper').default;

// instance of PosterApiWrapper, i think this is what it should look like
const api = new PosterAPI({
  baseURL: 'https://api.poster-social.com', 
  authToken: 'dummy'
});

(async () => {
  try {
    const profileResponse = await api.getUserProfile('exampleUser', { cacheTTL: 30000 });

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
