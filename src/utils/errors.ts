import type { FastifyReply } from "fastify";

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
) {
  return reply.status(statusCode).send({ error: message });
}

export function notFound(reply: FastifyReply, resource: string) {
  return sendError(reply, 404, `${resource} not found`);
}

export function unauthorized(reply: FastifyReply) {
  return sendError(reply, 401, "Invalid or missing API key");
}

export function forbidden(reply: FastifyReply) {
  return sendError(reply, 403, "You do not have permission to modify this resource");
}

export function badRequest(reply: FastifyReply, message: string) {
  return sendError(reply, 400, message);
}
