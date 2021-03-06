const audioService = require('@clin-player/audioservice-base');
const IDataView = audioService.dataView;
const dataViews = require('./vk-data-views');
const VKApi = require('../api');


/**
 * @type {ServiceVK}
 * @implements {IDataView}
 */
module.exports = class ServiceVK extends IDataView {
	constructor() {
		super();

		/**
		 * @type {IAudioServiceApi}
		 * @private
		 */
		this._vkApi = new VKApi;
	}

	/**
	 * @override
	 */
	getChildren() {
		return new vknp.Promise(function(resolve, reject) {
			resolve([
				new dataViews.Bookmarks(this._vkApi),
				new dataViews.Friends,
				new dataViews.Groups,
				new dataViews.News,
				new dataViews.Playlists
			]);
		});
	}

	/**
	 * @override
	 */
	toString() {
		return 'VK.COM';
	}
};
