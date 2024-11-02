import { config } from 'dotenv'

config()

export const { NODE_ENV, DB_URI, DB_NAME, BOT_TOKEN, BOT_CLIENT_ID } = process.env

export const PORT = Number.parseInt(process.env.PORT) || 5000
