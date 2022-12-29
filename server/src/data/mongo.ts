import {Db, Filter, MongoClient} from 'mongodb';
import config from '../../config';
import {UserType} from "./user";

export default class MongoHelper {
    static URI: string = config.mongo.uri || ''
    static DB_NAME: string = config.mongo.name || ''

    private client: MongoClient | undefined
    private db: Db | undefined

    private _user: UserDb | undefined

    constructor() {
        if (!MongoHelper.URI) {
            throw new DbError(
                DbError.Type.MISSING_REQUIRED_ENV_VAR,
                'MONGO_URI is not defined. Check your .env file.'
            )
        }
        if (!MongoHelper.DB_NAME) {
            throw new DbError(
                DbError.Type.MISSING_REQUIRED_ENV_VAR,
                'MONGO_DATABASE is not defined. Check your .env file.'
            )
        }
    }

    isConnected(): boolean {
        return !!(this.db && this.client)
    }

    async initCollections() {

    }

    async connect({maxPoolSize}: {maxPoolSize?: number}) {
        this.client = new MongoClient(MongoHelper.URI, {
            maxPoolSize: maxPoolSize || 15,
        })
        await this.client.connect()
        this.db = this.client.db(MongoHelper.DB_NAME)
        return this
    }

    async close() {
        if (!this.client) {
            console.warn(new DbError(DbError.Type.UNINITIALIZED, 'Cannot close uninitialized connection'))
            return
        }
        return await this.client.close()
    }

    get user() {
        if (!this.db) throw new DbError(DbError.Type.UNINITIALIZED, 'Database must be connected first')
        if (this._user) return this._user
        this._user = new UserDb(this.db)
        return this._user
    }
}

export async function initializeMongo(maxPoolSize?: number) {
    const db = new MongoHelper()
    const opts: {maxPoolSize?: number} = {}
    if (maxPoolSize) opts.maxPoolSize = maxPoolSize
    await db.connect(opts)
    await db.initCollections()
    global.mongo = db
    return db
}

type MongoObjectType = {
    uuid: string
}

class GenericDb<T extends MongoObjectType> {
    protected readonly TABLE: string = ''
    private db: Db

    constructor(db: Db) {
        this.db = db
    }

    get collection() {
        return this.db.collection(this.TABLE)
    }

    async initCollection() {
        await this.collection.createIndex({uuid: 1}, {unique: true})
    }

    protected async get(filters: Filter<Partial<T>>) {
        const r = await this.collection.findOne(filters)
        if (!r) return null
        return r
    }

    async getByUuid(uuid: string) {
        // @ts-ignore - extends ensure this is always valid
        return this.get({uuid})
    }

    protected async getAll(filters: Filter<Partial<T>>) {
        const rs = await this.collection.find(filters)
        if (!rs) return []
        return await rs.toArray()
    }

    async create(o: T) {
        const now = new Date()
        const sanitized = {...o, _id: undefined, created: now, updated: now}
        return this.collection.insertOne(sanitized)
    }

    protected async update(filter: Filter<Partial<T>>, o: Partial<T>) {
        const sanitized = {...o, _id: undefined, created: undefined, updated: new Date()}
        return this.collection.updateOne(filter, sanitized)
    }

    async updateByUuid(uuid: string, o: Partial<T>) {
        // @ts-ignore - extends ensure this is always valid
        return this.update({uuid}, o)
    }

    protected async remove(filter: Filter<Partial<T>>) {
        return this.collection.deleteOne(filter)
    }
}

class UserDb extends GenericDb<UserType> {
    protected readonly TABLE = 'users'

    constructor(db: Db) {
        super(db)
    }

    async initCollection() {
        await this.initCollection()
        await this.collection.createIndex({phone: 1})
        await this.collection.createIndex({address: 1})
    }

    async getByPhone(phone: string) {
        return this.get({phone})
    }

    async getByAddress(address: string) {
        return this.get({address})
    }
}

class DbError {
    private code: string
    private message: string
    static Type: {MISSING_REQUIRED_ENV_VAR: string; UNINITIALIZED: string; ALREADY_EXISTS: string}

    constructor(code: string, message: string) {
        this.code = code
        this.message = message
    }
}
DbError.Type = {
    MISSING_REQUIRED_ENV_VAR: 'ERR_MISSING_REQUIRED_ENV_VAR',
    UNINITIALIZED: 'ERR_UNINITIALIZED',
    ALREADY_EXISTS: 'ERR_ALREADY_EXISTS',
}