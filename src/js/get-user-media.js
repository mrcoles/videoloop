import Promise from 'bluebird';
import getUserMedia from 'getusermedia';

const promUserMedia = Promise.promisify(getUserMedia);
export default promUserMedia;
