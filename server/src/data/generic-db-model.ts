import {randomUUID} from 'crypto'

export default abstract class GenericDbModel<T extends GenericDbModel<any>> {
    public uuid?: string
    public modified: Date
    private readonly created: Date

    protected constructor(o: T) {
        if (!o.uuid) this.uuid = randomUUID()
        const now = new Date()
        this.modified = o.modified || now
        this.created = o.created || now
    }

    static async get(uuid: string): Promise<GenericDbModel<any> | null> {
        throw new Error('Not implemented')
    }

    static async create(o: GenericDbModel<any>): Promise<GenericDbModel<any>> {
        throw new Error('Not implemented')
    }

    static async update(o: GenericDbModel<any>): Promise<boolean> {
        throw new Error('Not implemented')
    }

    protected static async getWrap<T>(TInit: any, fn: (...args: any) => Promise<any>, ...args: any) {
        const r = await fn(...args)
        if (!r) return null
        return new TInit(r as unknown as T)
    }
}
