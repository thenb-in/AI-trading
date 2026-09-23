import { masterKeyOf } from './masterKey';

/**
 * The permission that governs what a record carries. A record's discussion and
 * its files belong to the record, so the master that owns it owns the rights
 * over them: saying something on a Geography is `comment_geography`, working
 * with its files is `attachment_geography`.
 *
 * `objectName` is the master's name as the record panel was given it, the same
 * name the comments and files are filed under.
 */
const recordPermissionName = (objectName, operation) => `${operation}_${masterKeyOf(objectName)}`;

export { recordPermissionName };
