var AudioServiceApiAbstract = require('@clin-player/audioservice-abstract/api');
var models = require('./models');



/**
 * @constructor
 * @extends {AudioServiceApiAbstract}
 * @implements {IAudioServiceApi}
 */
module.exports = (function() {
	return class AudioServiceApiVKCOM extends AudioServiceApiAbstract {
		constructor(config) {
			super();

			/**
			 * Fired with: none
			 * @const {string}
			 */
			this.EVENT_ERROR = 'error';

			/**
			 * @const {string}
			 */
			this.VERSION = '5.21';

			/**
			 * @type {string}
			 */
			this._token = config.token;

			/**
			 * @type {models.Config}
			 */
			this._config = config;
		}


		/**
		 * @override
		 */
		search(query) {
			return this.audioSearch(query, 300);
		}


		/**
		 * @override
		 */
		radio(query) {
			return this.getRadio(query, 300);
		}


		/**
		 * @param {string} exec
		 */
		execute(exec) {
			var body = 'execute?' +
				'code=' + exec;
			return this._requestWrapper(body);
		}


		/**
		 * @param {boolean} isShot
		 * @return {string}
		 */
		getAuthUrl(isShot) {
			var cfg = this._config;
			if (isShot) {
				return cfg.shortAuthUrl;
			} else {
				return cfg.authServer +
					'?client_id=' + cfg.clientId +
					'&scope=' + cfg.scope +
					'&redirect_uri=' + cfg.redirectUri +
					'&display=' + cfg.display +
					'&response_type=' + cfg.responseType;
			}
		}


		/**
		 * @return {string}
		 */
		getExternalAuthUrl() {
			return this._config.externalAuthServer;
		}


		/**
		 * @return {Promise.<number>}
		 */
		getUserId() {
			var body = 'users.get?';
			return this._requestWrapper(body)
				.then(function(user) {
					return user[0]['id'];
				});
		}


		/**
		 * @param {string} artist
		 * @param {number} count
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 */
		audioSearch(artist, count) {
			var body = 'audio.search?q=' + artist +
				'&performer_only=1' +
				'&count=' + count;

			return this._requestWrapper(body)
				.then(function(response) {
					var tracks = response['items'] || [];
					return tracks.map(function(track) {
						return new models.AudioTrack(track);
					});
				});
		}


		/**
		 * @param {number=} opt_ownerId
		 * @param {number=} opt_count
		 * @param {number=} opt_albumId
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 */
		getAudio(opt_ownerId, opt_count, opt_albumId) {
			var body = 'audio.get?' +
				(opt_ownerId ? 'owner_id=' + opt_ownerId : '') +
				(opt_count ? '&count=' + opt_count : '') +
				(opt_albumId ? '&album_id=' + opt_albumId : '');

			return this._requestWrapper(body)
				.then(function(response) {
					var tracks = response['items'];
					return tracks.map(function(track) {
						return new models.AudioTrack(track);
					});
				});
		}

		/**
		 * @param {?number} ownerId
		 * @param {number=} opt_count
		 * @return {Promise.<Array.<models.Album>>}
		 */
		getAudioAlbums(ownerId, opt_count) {
			var body = 'audio.getAlbums?' +
				(ownerId ? '&owner_id=' + ownerId : '') +
				(opt_count ? '&count=' + opt_count : '');

			return this._requestWrapper(body)
				.then(function(response) {
					var albums = response['items'];
					return albums.map(function(album) {
						return new models.Album(album);
					});
				});
		}


		/**
		 * @param {string} title
		 * @return {?Promise.<number>}
		 */
		createAudioAlbum(title) {
			if (title) {
				var body = 'audio.addAlbum?' +
					'title=' + title;
				return this._requestWrapper(body)
					.then(function(albumId) {
						this.emit(this.EVENT_ADD_ALBUM, albumId);
						return albumId;
					}.bind(this));
			} else {
				return null;//todo good it?
			}

		}


		/**
		 * @param {number} albumId
		 * @return {Promise.<boolean>}
		 */
		deleteAudioAlbum(albumId) {
			var body = 'audio.deleteAlbum?' +
				'album_id=' + albumId;
			return this._requestWrapper(body)
				.then(function(result) {
					if (!!result) {
						this.emit(this.EVENT_REMOVE_ALBUM, albumId);
					}
					return !!result;
				}.bind(this));
		}


		/**
		 * @param {number} albumId
		 * @param {string} title
		 * @return {*|Promise}
		 */
		renameAudioAlbum(albumId, title) {
			var body = 'audio.editAlbum?' +
				'album_id=' + albumId +
				'&title=' + title;
			return this
				._requestWrapper(body)
				.then(function(result) {
					if (!!result) {
						this.emit(this.EVENT_RENAME_ALBUM, albumId);
					}
					return !!result;
				}.bind(this));
		}


		/**
		 * @param {number} albumId
		 * @param {string} audioIds number split comma
		 * @return {Promise.<boolean>}
		 */
		moveAudioToAlbum(albumId, audioIds) {
			var body = 'audio.moveToAlbum?' +
				'album_id=' + albumId +
				'&audio_ids=' + audioIds;
			return this
				._requestWrapper(body)
				.then(function(result) {
					if (!!result) {
						this.emit(this.EVENT_ADD_AUDIO_TO_ALBUM, albumId);
					}
					return !!result;
				}.bind(this));
		}


		/**
		 * @param {number} ownerId
		 * @param {number} newsId
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 */
		getAudioFromNews(ownerId, newsId) {
			var body = 'wall.getById' +
				'?posts=' + ownerId + '_' + newsId;
			return this
				._requestWrapper(body)
				.then(function(response) {
					var items = response['items'];
					if (items[0]['attachments']) {
						return this._getAudioFromNews(items[0]['attachments']);
					} else if (items[0]['copy_history'] && items[0]['copy_history'][0]['attachments']) {
						return this._getAudioFromNews(items[0]['copy_history'][0]['attachments']);
					}
				}.bind(this));
		}


		/**
		 * @param {string} artist
		 * @param {number} count
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 */
		getRadio(artist, count) {
			return this
				._checkArtist(artist)
				.then(function(trackOrOwnerId) {
					if (trackOrOwnerId instanceof Array || trackOrOwnerId instanceof models.AudioTrack) {
						return trackOrOwnerId;
					} else {
						return this._addRemoveAudio(trackOrOwnerId, artist, count);
					}
				}.bind(this))
				.then(function(track) {
					if (track instanceof Array) {
						return track;
					} else {
						return this._getRadio(track, count);
					}
				}.bind(this))
				.then(function(tracks) {
					return tracks.map(function(track) {
						return new models.AudioTrack(track);
					});
				});
		}


		/**
		 * @param {number} count
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 */
		getRecommendationMusic(count) {
			var body = 'audio.getRecommendations?' +
				'&count=' + count +
				'&shuffle=' + 0;
			return this
				._requestWrapper(body)
				.then(function(response) {
					var tracks = response['items'] || [];
					return tracks.map(function(track) {
						return new models.AudioTrack(track);
					});
				});
		}


		/**
		 * @param {number} count
		 * @return {Promise.<Array.<models.Friend>>}
		 */
		getFriends(count) {
			var body = 'friends.get?' +
				'order=hints' +
				'&count=' + count +
				'&fields=online';

			return this
				._requestWrapper(body)
				.then(function(response) {
					var friends = response['items'];
					return friends.map(function(item) {
						return new models.Friend(item);
					});
				});
		}


		/**
		 * @return {Promise.<models.Group>}
		 */
		getGroups() {
			var body = 'groups.get?' +
				'extended=' + 1;

			return this
				._requestWrapper(body)
				.then(function(response) {
					var groups = response['items'];
					return groups.map(function(group) {
						return new models.Group(group);
					});
				});
		}


		/**
		 * @param {{
		 *      listIds: (string|undefined),
		 *      filter: (string|undefined),
		 *      count: (string|undefined)
		 * }} params
		 * @return {Promise.<models.Group>}
		 */
		getNews(params) {
			var body = 'newsfeed.get' +
				(params.listIds ? '?source_ids=' + 'list{' + params.listIds + '}' : '?') +
				'&filters=' + params.filter +
				'&count=' + params.count;

			return this
				._requestWrapper(body)
				.then(function(response) {
					return new models.News(response);
				});
		}


		/**
		 * @return {Promise.<{
		 *      title: string,
		 *      id: number
		 * }>}
		 */
		getListNews() {
			var body = 'newsfeed.getLists?';

			return this
				._requestWrapper(body)
				.then(function(response) {
					var list = response['items'];
					return list.map(function(item) {
						return {
							title: item['title'],
							id: item['id']
						};
					});
				});
		}


		/**
		 * @param {{
		 *      offset: (number|undefined),
		 *      count: (number|undefined)
		 *      extended: (number|undefined),
		 * }} params
		 * @return {Promise.<models.News>}
		 */
		getListNewsFeed(params) {
			var body = 'fave.getPosts?' +
				(params.offset ? '&offset=' + params.offset : '') +
				(params.count ? '&count=' + params.count : '') +
				(params.extended ? '&extended=' + params.extended : '');

			return this
				._requestWrapper(body)
				.then(function(response) {
					return new models.News(response);
				});
		}


		/**
		 * @param {number} ownerId
		 * @param {number} trackId
		 * @return {Promise.<number>}
		 */
		addAudio(ownerId, trackId) {
			var body = 'audio.add' +
				'?audio_id=' + trackId +
				'&owner_id=' + ownerId;
			return this._requestWrapper(body);
		}


		/**
		 * @param {number} ownerId
		 * @param {number} trackId
		 * @return {Promise.<number>}
		 */
		deleteAudio(ownerId, trackId) {
			var body = 'audio.delete' +
				'?audio_id=' + trackId +
				'&owner_id=' + ownerId;
			return this._requestWrapper(body);
		}


		/**
		 * @return {Promise.<number>}
		 */
		initStats() {
			var body = 'stats.trackVisitor';
			return this._requestWrapper(body);
		}


		/**
		 * @param {number} ownerId
		 * @param {string} trackId
		 * @return {Promise.<string>}
		 */
		getAudioTrackById(ownerId, trackId) {
			var body = 'audio.getById' +
				'?audios=' + ownerId + '_' + trackId;
			return this._requestWrapper(body);
		}


		/**
		 * @param {string} body
		 * @return {?Promise.<Array.<*>>}
		 * @private
		 */
		_requestWrapper(body) {
			if (!this._token) {
				this.emit(this.EVENT_ERROR, 5);
			}
			var header = 'https://api.vk.com/method/';
			var tail = (this.VERSION ? '&v=' + this.VERSION : '') + (this._token ? '&access_token=' + this._token : '');
			var url = header + body + tail;

			return this
				._request(url)
				.then(function(response) {
					response = JSON.parse(response);
					if (response['error']) {
						this.emit(this.EVENT_ERROR, response['error']);
					}
					return response['response'];
				}.bind(this));
		}


		/**
		 * @param {AudioTrack} track
		 * @param {number} count
		 * @return {Promise.<Array.<*>>}
		 * @private
		 */
		_getRadio(track, count) {
			if (track) {
				var targetAudio = track.ownerId + '_' + track.id;
				var body = 'audio.getRecommendations?' +
					'target_audio=' + targetAudio +
					'&count=' + count +
					'&shuffle=' + 0;

				return this._requestWrapper(body)
					.then(function(response) {
						return response['items'];
					});
			}
		}


		/**
		 * @param {string} artist
		 * @return {Promise.<AudioTrack|number>}
		 * @private
		 */
		_checkArtist(artist) {
			return this
				.getAudio()
				.then(function(tracks) {
					var arr = tracks.filter(function(track) {
						if (track.artist.toLowerCase() === artist.toLowerCase()) {
							return true;
						}
					});
					if (arr && arr.length) {
						return arr[0];
					} else {
						return tracks[0].ownerId;
					}
				});
		}


		/**
		 * @param {number} ownerId
		 * @param {string} artist
		 * @param {count} count
		 * @return {Promise.<Array.<models.AudioTrack>>}
		 * @private
		 */
		_addRemoveAudio(ownerId, artist, count) {
			var resultTracks = [];
			var addedTrack;
			return this
				.audioSearch(artist, 50)
				.then(function(tracks) {
					return this.addAudio(tracks[0].ownerId, tracks[0].id);
				}.bind(this))
				.then(function(trackId) {
					if (trackId) {
						addedTrack = {
							ownerId: ownerId,
							id: trackId
						};
						return this._getRadio(addedTrack, count);
					}
				}.bind(this))
				.then(function(tracks) {
					resultTracks = tracks;
					return this.deleteAudio(addedTrack.ownerId, addedTrack.id);
				}.bind(this))
				.then(function() {
					return resultTracks;
				});
		}


		/**
		 * @param {Array.<*>} items
		 * @return {Promise.<models.AudioTrack>}
		 * @private
		 */
		_getAudioFromNews(items) {
			return items
				.map(function(item) {
					if (item['audio']) {
						return new models.AudioTrack(item['audio']);
					}
				})
				.filter(function(item) {
					return !!item;
				});
		}
	};
})();
