function sendSuccess(res, data = {}, pagination = null) {
    const payload = {
        success: true,
        data,
        meta: {},
        errors: []
    };
    if (pagination) {
        payload.pagination = pagination;
    }
    return res.json(payload);
}

function sendError(res, errorObj) {
    const code = errorObj.code || 'INTERNAL_ERROR';
    const message = errorObj.message || 'An unexpected error occurred';
    const statusCode = errorObj.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message
        }
    });
}

function parsePagination(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const sort = req.query.sort || 'created_at';
    const direction = (req.query.direction || 'desc').toUpperCase();
    
    return {
        page,
        limit,
        sort,
        direction: direction === 'ASC' ? 'ASC' : 'DESC',
        offset: (page - 1) * limit
    };
}

module.exports = { sendSuccess, sendError, parsePagination };
