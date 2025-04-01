import io from 'socket.io-client';
import axios from 'axios';

// cache implementation
class SimpleCache {
	constructor() {
		// Map functions like a hash map
		this.cache = new Map();
	}
	// cache stores key value pairs
	// for example when we request the user page, we might use a key of
	// userId or username, the map then holds an object associated with this key
	// hashmaps give us fast lookups, the whole point of caching is to be fast 🏃
	set(key, value, ttl) {
		// each object stored in the map has a time to live (ttl) which is how long we hold the cache for
		// we dont want the ttl to be too long just incase any important information updates on the backend
		// ofcourse expiry is a simple calculation
		const expiry = Date.now() + ttl;
		// put the object into memory with the key, value and expiry
		this.cache.set(key, {
			value,
			expiry
		});
	}
	// get a object given a key
	get(key) {
		// check if it even exists
		if (!this.cache.has(key)) return null;
		// grab the object along with its expiry given the key
		const {
			value,
			expiry
		} = this.cache.get(key);
		// check if we have exceeded the expiry, if so remove from the map and return null
		if (Date.now() > expiry) {
			this.cache.delete(key);
			return null;
		}
		// return our object
		return value;
	}
	// allow us to delete an object from memory
	// ... lets try keep things clean
	clear(key) {
		this.cache.delete(key);
	}
}

// unified poster-api wrapper for both browser and backend
class PosterAPI {
	// config: configuration options
	// config.baseURL: https://api.poster-social.com, or any other url which runs the poster-api docker container
	// config.authToken: the authorisation token
	// config.cacheEnabled: i feel this should only be enabled when testing and for production release
	// config.defaultTTL=60000: the ttl for responses, default is 60s
	constructor({
		baseURL,
		authToken,
		cacheEnabled = true,
		defaultTTL = 60000
	}) {
		this.baseURL = baseURL;

		// create an axios instance
		this.axios = axios.create({
			baseURL,
			withCredentials: true,
			headers: {
				'Content-Type': 'application/json'
			},
		});

		// set the cookie as authToken when authToken provided
		if (authToken) {
			this.setAuthToken(authToken);
		}

		// create cache
		this.cache = new SimpleCache();
		this.cacheEnabled = cacheEnabled;
		this.defaultTTL = defaultTTL;
	}

	// SECTION: websockets

	// start websocket connection to backend
	_wsConnection(port) {
		const url = new URL(this.baseURL);
		const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
		const socketURL = `${protocol}://${url.hostname}:${port}`;

		const socket = io(socketURL, {
			auth: { token: this.authToken }
		});

		return socket;
	}

	// public method to init web socket connection
	initWsConnection(port) {
		if (!this.socket) {
			this.socket = this._wsConnection(port);
		}
	}

	// for chat page
	chatWsConnection(port, messageCallback, typingCallback) {
		this.initWsConnection(port);

		this.socket.on('new_message', (data) => {
			console.log('received message:', data);
			if (typeof messageCallback === 'function') {
				messageCallback(data);
			}
		});

		this.socket.on('typing', (data) => {
			console.log('received typing:', data);
			if (typeof typingCallback === 'function') {
				typingCallback(data);
			}
		});
	}

	// notification web socket connection
	notificationWsConnection(port, notificationCallback) {
		this.initWsConnection(port);

		this.socket.on('new_notification', (data) => {
			console.log('notification recieved: ', data);
			if (typeof notificationCallback === 'function') {
				notificationCallback(data.notificationData);
			}
		});
	}

	// set or update authToken given token
	setAuthToken(token) {
		this.authToken = token;

		if (token) {
			// api uses auth header for storing authToken
			this.axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
		} else {
			delete this.axios.defaults.headers.common["Authorization"];
		}
	}

	// the _ doesnt do anything but i read somewhere its good practice to make sure 
	// that it is noted its for internal use within the class, doesnt change anything at runtime

	// this function allows us to pass a cacheKey in, a request function and a ttl
	// it checks if the cache is enabled, if we can find a past request that has
	// been cached we can return it, if the expiry has been exceeded
	// cache.get will return null, so immediatly we call requestFn to retrieve the data

	// if cache is enabled for the request fun, we cache the response with the ttl
	// or if that isnt set we do a default of 60s, then we return the response
	async _cachedRequest(key, requestFn, ttl) {
		if (this.cacheEnabled) {
			const cached = this.cache.get(key);
			if (cached) {
				return cached;
			}
		}
		const response = await requestFn();
		if (this.cacheEnabled) {
			this.cache.set(key, response, ttl || this.defaultTTL);
		}
		return response;
	}

	// SECTION: user

	// register a user given data
	registerUser(data) {
		// data: { username, email, password }
		return this.axios.post('/user/register', data).then(res => res.data);
	}

	// login a user given data
	loginUser(data) {
		// data: { usernameOrEmail, password }
		return this.axios.post('/user/login', data).then(res => res.data);
	}

	// reset password
	resetPassword(data) {
		// data: { oldPassword, newPassword, email }
		return this.axios.post('/user/reset-password', data).then(res => res.data);
	}

	// log a user out
	logoutUser() {
		return this.axios.post('/user/logout').then(res => res.data);
	}

	// auth user
	auth() {
		return this.axios.get('/user/auth').then(res => res.data);
	}

	// get user profile given a username
	getUserProfile(username, {
		cacheTTL
	} = {}) {
		// profiles are good to cache, reason being is we can retrieve all users
		// in the post feed once the posts are loaded, so profiles are already in memory
		// when we go to view a profile page
		const cacheKey = `userProfile_${username}`;
		return this._cachedRequest(
			cacheKey,
			() => this.axios.get(`/user/profile/${username}`).then(res => res.data),
			cacheTTL
		);
	}

	// get newly signed up users
	getNewUsers() {
		return this.axios.get('/analytics/new/users').then(res => res.data);
	}

	// get user profile given a userId
	getUserProfileById(userId, { cacheTTL } = {}) {
		const cacheKey = `userProfileById_${userId}`;
		return this._cachedRequest(
			cacheKey,
			() => this.axios.get(`/user/profile/id/${userId}`).then(res => res.data),
			cacheTTL
		);
	}

	// update user info given data 
	updateUserInfo(data) {
		// data: { newEmail, newUsername }
		return this.axios.post('/user/update-info', data).then(res => res.data);
	}

	// delete an account given data
	deleteAccount(data) {
		// data: { userId, usernameOrEmail, password }
		return this.axios.post('/user/delete-account', data).then(res => res.data);
	}

	// update self profile picture given a file
	updateProfilePicture(file) {
		// file: a file object or stream
		// TODO: make sure to test this soon
		const formData = new FormData();
		formData.append('image', file);
		return this.axios.post('/user/profile-image', formData, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		}).then(res => res.data);
	}

	// follow a user for a given userId
	followUser(userIdToFollow) {
		return this.axios.post('/user/follow', {
			userIdToFollow
		}).then(res => res.data);
	}

	getHomeFeed(page) {
		// feed is dynamic, so i dont believe we should cache this
		return this.axios.get(`/user/feed/${page}`).then(res => res.data);
	}

	// get following for a given userId
	getFollowing(userId) {
		const cacheKey = `following_${userId}`;
		return this._cachedRequest(
			cacheKey,
			() => this.axios.get(`/user/following/${userId}`).then(res => res.data)
		);
	}

	// get followers for a given userId
	getFollowers(userId) {
		const cacheKey = `followers_${userId}`;
		return this._cachedRequest(
			cacheKey,
			() => this.axios.get(`/user/followers/${userId}`).then(res => res.data)
		);
	}

	// SECTION: notifications

	getNotifications(page = 1) {
		return this.axios.get(`/notification/all/${page}`).then(res => res.data);
	}

	readNotification(notificationId) {
		return this.axios.patch(`/notification/read/id/${notificationId}`).then(res => res.data);
	}

	readAllNotification() {
		return this.axios.patch(`/notification/read/all`).then(res => res.data);
	}

	// SECTION: posts

	createPost(data) {
		// data: { title, content, images }
		return this.axios.post('/post/create', data).then(res => res.data);
	}

	// delete a post for a given postId
	deletePost(postId) {
		return this.axios.delete(`/post/delete/${postId}`).then(res => res.data);
	}

	// get a user by a given userId
	getPostsByUser(userId) {
		return this.axios.get(`/post/author/${userId}`).then(res => res.data);
	}

	// get a post by a given postId
	getPostById(postId) {
		return this.axios.get(`/post/${postId}`).then(res => res.data);
	}

	// search posts using a search query, supports regex
	// TODO: review regex if its actually a good idea, backend problem :(
	searchPosts(searchQuery) {
		return this.axios.post('/post/search', {
			searchQuery
		}).then(res => res.data);
	}

	// SECTION: comments

	addCommentToPost(data) {
		// data: { postId, content }
		return this.axios.post('/comment/create', data).then(res => res.data);
	}

	// delete a comment for a given commentId
	deleteComment(commentId) {
		return this.axios.delete(`/comment/delete/${commentId}`).then(res => res.data);
	}

	// get a comment for a given commentId
	getCommentById(commentId) {
		return this.axios.get(`/comment/${commentId}`).then(res => res.data);
	}

	// get comments for a given postId
	getCommentsByPost(postId) {
		return this.axios.get(`/comment/post/${postId}`).then(res => res.data);
	}

	// like a comment for a given commentId
	likeComment(commentId) {
		return this.axios.post('/comment/like', {
			commentId
		}).then(res => res.data);
	}

	// like a post for a given postId
	likePost(postId) {
		return this.axios.post('/post/like', {
			postId
		}).then(res => res.data);
	}

	// SECTION: messaging

	startConversation(participants) {
		// participants: array of userIds, does not include self
		return this.axios.post('/conversation/create', {
			participants
		}).then(res => res.data);
	}

	// delete conversation
	deleteConversation(conversationId) {
		return this.axios.delete(`/conversation/delete/${conversationId}`).then(res => res.data);
	}

	// send a message to a conversation
	sendMessage(conversationId, content) {
		return this.axios.post('/message/send', {
			conversationId,
			content
		}).then(res => res.data);
	}

	// send typing
	sendTyping(conversationId) {
		return this.axios.patch(`/message/typing/${conversationId}`).then(res => res.data);
	}

	// get all conversations a user is a participant in
	getConversations() {
		return this.axios.get('/conversation/all').then(res => res.data);
	}

	// get message thread for a given conversationId
	getMessageThread(conversationId) {
		return this.axios.get(`/message/thread/${conversationId}`).then(res => res.data);
	}

	// SECTION: image uploading

	// upload image 
	uploadImage(file) {
		const formData = new FormData();
		formData.append('image', file);
		return this.axios.post('/upload/image', formData, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		}).then(res => res.data);
	}

	// SECTION: spotify

	// link spotify
	linkSpotify() {
		return this.axios.get('/spotify/auth').then(res => res.data);
	}
	
	// unlink spotify 
	unlinkSpotify() {
		return this.axios.get('/user/spotify/unlink').then(res => res.data);
	}

	// top artists for userId
	getSpotifyTopArtists(userId) {
		let url = '/spotify/top/artists';
		if (userId) url += `/${userId}`;
		return this.axios.get(url).then(res => res.data);
	}

	// top tracks for userId
	getSpotifyTopTracks(userId) {
		let url = '/spotify/top/tracks';
		if (userId) url += `/${userId}`;
		return this.axios.get(url).then(res => res.data);
	}

	// currently playing spotify for userId
	getCurrentlyPlaying(userId) {
		let url = '/spotify/playing';
		if (userId) url += `/${userId}`;
		return this.axios.get(url).then(res => res.data);
	}

	// user should only be able to create reports, not read or process
	// TODO: admin panel
	createReport(reportData) {
		return this.axios.post('/report/create', reportData).then(res => res.data);
	}

	// get reports if user is admin
	getReports() {
		return this.axios.get('/report/all').then(res => res.data);
	}
}

export default PosterAPI;