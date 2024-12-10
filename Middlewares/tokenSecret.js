const secret_api = process.env.SECRET_API_TOKEN
const secret_wh = process.env.SECRET_WH_TOKEN

const SECRET_MAP = {
    'restapitoken': secret_api,
    'webhookapitoken': secret_wh
}

const validateSecret = (secret_name) => {
    return (req, res, next) => {
        const authHeader = req.headers[secret_name];
        if (!authHeader || authHeader !== SECRET_MAP[secret_name]) return res.status(401).json({ message: 'Unauthorized, token missing or malformed' })
        next();
    }
}

module.exports = {
    validateSecret
}