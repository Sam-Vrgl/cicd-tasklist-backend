import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should create a task with only a title", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "Title Only" });

			expect(res.status).toBe(201);
			expect(res.body.title).toBe("Title Only");
			expect(res.body.description).toBeNull();
		});

		it("should return 400 when title is missing", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "No title" });

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Title is required and must be a non-empty string");
		});

		it("should return 400 when title is empty", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "" });

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Title is required and must be a non-empty string");
		});

		it("should return 400 when title is whitespace only", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "   " });

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Title is required and must be a non-empty string");
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty array when there are no tasks", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all tasks ordered by createdAt desc", async () => {
			await testPrisma.task.create({ data: { title: "First Task" } });
			await testPrisma.task.create({ data: { title: "Second Task" } });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body[0].title).toBe("Second Task");
			expect(res.body[1].title).toBe("First Task");
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a task by ID", async () => {
			const task = await testPrisma.task.create({ data: { title: "Find Me" } });

			const res = await request(app).get(`/api/tasks/${task.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(task.id);
			expect(res.body.title).toBe("Find Me");
		});

		it("should return 400 for a non-numeric ID", async () => {
			const res = await request(app).get("/api/tasks/abc");

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Invalid task ID");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).get("/api/tasks/99999");

			expect(res.status).toBe(404);
			expect(res.body.error).toBe("Task not found");
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update a task", async () => {
			const task = await testPrisma.task.create({ data: { title: "Original Title" } });

			const res = await request(app)
				.put(`/api/tasks/${task.id}`)
				.send({ title: "Updated Title", completed: true });

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Updated Title");
			expect(res.body.completed).toBe(true);
		});

		it("should return 400 for a non-numeric ID", async () => {
			const res = await request(app)
				.put("/api/tasks/abc")
				.send({ title: "Updated" });

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Invalid task ID");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app)
				.put("/api/tasks/99999")
				.send({ title: "Updated" });

			expect(res.status).toBe(404);
			expect(res.body.error).toBe("Task not found");
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete a task and return 204", async () => {
			const task = await testPrisma.task.create({ data: { title: "Delete Me" } });

			const res = await request(app).delete(`/api/tasks/${task.id}`);

			expect(res.status).toBe(204);

			const deleted = await testPrisma.task.findUnique({ where: { id: task.id } });
			expect(deleted).toBeNull();
		});

		it("should return 400 for a non-numeric ID", async () => {
			const res = await request(app).delete("/api/tasks/abc");

			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Invalid task ID");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).delete("/api/tasks/99999");

			expect(res.status).toBe(404);
			expect(res.body.error).toBe("Task not found");
		});
	});
});
