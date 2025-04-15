// GPT GENERATED

// src/tests/posterApi.test.mjs
import PosterAPI from '../posterApiWrapper.js';

/**
 * Helper that wraps an async API call and logs a detailed error message on failure.
 * @param {Function} requestFn - An async function making the API call.
 * @param {string} context - A label for the API request.
 */
const handleRequest = async (requestFn, context) => {
  try {
    return await requestFn();
  } catch (error) {
    console.error(
      `[${context}] Axios error:`,
      error.response ? JSON.stringify(error.response.data, null, 2) : error.message
    );
    throw error;
  }
};

describe('Full PosterAPI Flow', () => {
  // Set your API base URL
  const baseURL = 'https://api.poster-social.com';
  // Create an API instance (without an auth token initially)
  const api = new PosterAPI({ baseURL });

  // Variables to store IDs and tokens for later steps
  let newUserId;
  let newUserAuthToken;
  let postId;
  let commentId;
  let test2UserId;
  let conversationId;

  test('should run the full API flow', async () => {
    // STEP 1: Register a new user (ensure unique username/email)
    const uniqueSuffix = Date.now();
    const newUser = {
      username: `testuser${uniqueSuffix}`,
      email: `testUser${uniqueSuffix}@example.com`,
      password: "Hello@123"
    };

    const registerResponse = await handleRequest(
      () => api.registerUser(newUser),
      'Register User'
    );
    expect(registerResponse).toHaveProperty('message', 'user created successfully');
    expect(registerResponse).toHaveProperty('user');
    expect(registerResponse.user).toHaveProperty('id');
    newUserId = registerResponse.user.id;

    // STEP 2: Login the newly registered user
    const loginResponse = await handleRequest(
      () => api.loginUser({
        usernameOrEmail: newUser.username,
        password: newUser.password,
      }),
      'Login User'
    );
    expect(loginResponse).toHaveProperty('token');
    newUserAuthToken = loginResponse.token;

    // Set the auth token on the API instance for authenticated calls
    api.setAuthToken(newUserAuthToken);

    // STEP 3: Auth user to retrieve user details
    const authResponse = await handleRequest(
      () => api.auth(),
      'Auth User'
    );
    expect(authResponse).toHaveProperty('user');
    expect(authResponse.user).toHaveProperty('id', newUserId);

    // STEP 4: Create a new post
    const postResponse = await handleRequest(
      () => api.createPost({
        title: "Integration Test Post",
        content: "This is the content of the integration test post.",
        images: []
      }),
      'Create Post'
    );
    expect(postResponse).toHaveProperty('message', 'post created successfully');
    expect(postResponse).toHaveProperty('postId');
    postId = postResponse.postId;

    // STEP 5: Add a comment to the new post
    const commentResponse = await handleRequest(
      () => api.addCommentToPost({
        postId: postId,
        content: "This is a test comment!"
      }),
      'Add Comment'
    );
    expect(commentResponse).toHaveProperty('message', 'comment created successfully');
    expect(commentResponse).toHaveProperty('commentId');
    commentId = commentResponse.commentId;

    // STEP 6: Retrieve profile info for test user "test2" 
    // (Ensure that user "test2" exists on your backend)
    const test2ProfileResponse = await handleRequest(
      () => api.getUserProfile('test2'),
      'Get Test2 Profile'
    );
    expect(test2ProfileResponse).toHaveProperty('message', 'retrieved user successfully');
    expect(test2ProfileResponse).toHaveProperty('user');
    test2UserId = test2ProfileResponse.user.id;

    // STEP 7: Start a conversation with test user "test2"
    const conversationResponse = await handleRequest(
      () => api.startConversation([test2UserId]),
      'Start Conversation'
    );
    expect(conversationResponse).toHaveProperty('message', 'conversation started successfully');
    expect(conversationResponse).toHaveProperty('conversationId');
    conversationId = conversationResponse.conversationId;

    // Optionally log IDs to help debug further:
    console.log({
      newUserId,
      postId,
      commentId,
      test2UserId,
      conversationId,
    });
  });
});