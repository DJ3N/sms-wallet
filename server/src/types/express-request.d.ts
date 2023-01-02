import User from '../data/user'

export {}

declare global {
    namespace Express {
        interface Request {
            processedBody?: any
            user?: User
        }
    }
}
