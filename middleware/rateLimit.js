/*
  A simple in-memory limit on repeated attempts (e.g. admin sign-in),
  counted per visitor IP. Enough for one server; resets when it restarts.
*/

module.exports = function rateLimit({ windowMs, max, message }) {

    const hits = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs).unref();

    return (req, res, next) => {

        const key = req.ip;
        const now = Date.now();

        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count++;

        if (entry.count > max) {
            res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ success: false, message });
        }

        next();

    };

};
