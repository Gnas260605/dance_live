// validator.js
const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const musicSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    musicId: Joi.string().required(),
    genre: Joi.string().valid('PHONK', 'TIKTOK_TREND', 'EDM_HYPE', 'HIPHOP').optional()
});

const danceSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    danceId: Joi.string().required(),
    genre: Joi.string().valid('PHONK', 'TIKTOK_TREND', 'EDM_HYPE', 'HIPHOP').optional()
});

const overlaySchema = Joi.object({
    overlayTitle: Joi.string().max(100).optional(),
    overlayColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
});

function validate(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    };
}

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    musicSchema,
    danceSchema,
    overlaySchema
};
