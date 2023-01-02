import {Db, Filter, MongoClient} from 'mongodb';
import config from '../config';
import UserType from "./user";
import { randomUUID } from 'crypto';
import RequestType from "./request";
import PreferenceType from "./setting";

export default class MongoHelper {
    static URI: string = config.mongo.uri || ''
    static DB_NAME: string = config.mongo.name || ''

    private client: MongoClient | undefined
    private db: Db | undefined

    private subsets: Map<string, GenericDb<MongoObjectType>> = new Map()

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

    async initCollections() {
        const ps: Promise<any>[] = []
        this.subsets.forEach((v) => {
            ps.push(v.initCollection())
        });
        return Promise.all(ps);
    }

    private getSubset(k: string, SubsetInitializer: any) {
        if (!this.db) throw new DbError(DbError.Type.UNINITIALIZED, 'Database must be connected first')
        if (!this.subsets.has(k)) {
            this.subsets.set(k, new SubsetInitializer(this.db))
        }
        return this.subsets.get(k)
    }

    get user() {
        return this.getSubset('users', UserDb) as UserDb
    }

    get request() {
        return this.getSubset('requests', RequestDb) as RequestDb
    }

    get preference() {
        return this.getSubset('preferences', PreferenceDb) as PreferenceDb
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
    uuid?: string
}

export class GenericDb<T extends MongoObjectType> {
    protected readonly TABLE: string = ''
    private db: Db

    constructor(db: Db) {
        this.db = db
    }

    get collection() {
        if (!this.TABLE) throw new DbError(DbError.Type.INVALID_COLLECTION, `Invalid collection "${this.TABLE}", did you forget to override TABLE?`)
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

    async getByUUID(uuid: string) {
        // @ts-ignore - extends restriction on gen type ensures this is always valid
        return this.get({uuid})
    }

    protected async getAll(filters: Filter<Partial<T>>) {
        const rs = await this.collection.find(filters)
        if (!rs) return []
        return await rs.toArray()
    }

    async create(o: T) {
        const now = new Date()
        const sanitized = {uuid: this.generateUUID(), ...o, _id: undefined, created: now, updated: now}
        await this.collection.insertOne(sanitized)
        return sanitized.uuid
    }

    protected async update(filter: Filter<Partial<T>>, o: Partial<T>) {
        const sanitized = {...o, _id: undefined, created: undefined, updated: new Date()}
        return this.collection.updateOne(filter, sanitized)
    }

    async updateByUUID(uuid: string, o: Partial<T>) {
        // @ts-ignore - extends restriction on gen type ensures this is always valid
        return this.update({uuid}, o)
    }

    protected async remove(filter: Filter<Partial<T>>) {
        return this.collection.deleteOne(filter)
    }

    protected generateUUID() {
        return randomUUID()
    }
}

class UserDb extends GenericDb<UserType> {
    protected readonly TABLE = 'users'

    async initCollection() {
        await super.initCollection()
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

class RequestDb extends GenericDb<RequestType> {
    protected readonly TABLE = 'requests'

    async initCollection() {
        await super.initCollection()
        await this.collection.createIndex({address: 1})
        await this.collection.createIndex({hash: 1})
        await this.collection.createIndex({txHash: 1})
    }

    async complete(uuid: string, txHash: string) {
        return this.updateByUUID(uuid, {txHash})
    }
}

class PreferenceDb extends GenericDb<PreferenceType> {
    protected readonly TABLE = 'preferences'

    async initCollection(): Promise<void> {
        await super.initCollection()
        await this.collection.createIndex({user: 1}, {unique: true})
    }

    async getByUser(userUUID: string) {
        return this.get({user: userUUID})
    }
}

enum DbErrorCode {
    MISSING_REQUIRED_ENV_VAR = 'ERR_MISSING_REQUIRED_ENV_VAR',
    UNINITIALIZED = 'ERR_UNINITIALIZED',
    ALREADY_EXISTS = 'ERR_ALREADY_EXISTS',
    INVALID_COLLECTION = 'ERR_INVALID_COLLECTION',
}

class DbError {
    private code: DbErrorCode
    private message: string
    static Type = DbErrorCode

    constructor(code: DbErrorCode, message: string) {
        this.code = code
        this.message = message
    }
}
