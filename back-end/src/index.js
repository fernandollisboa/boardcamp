import pg from "pg";
import express from "express";
import Joi from "joi";
import joidate from "@joi/date";
import cors from "cors";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(express.json());

const joi = Joi.extend(joidate);
const { Pool } = pg;

const categorySchema = joi.object({
	name: joi.string().min(3).required(),
});

const gameSchema = joi.object({
	name: joi.string().required(),
	image: joi.string().pattern(/^http:/),
	stockTotal: joi.number().integer().min(1).required(),
	categoryId: joi.number().integer().required(),
	pricePerDay: joi.number().integer().min(1).required(),
});

export const customerSchema = joi.object({
	name: joi.string().min(1).required(),
	phone: joi.string().min(10).max(11).required(),
	cpf: joi.string().length(11).required(),
	birthday: joi.string().required(),
});

export const rentalSchema = joi.object({
	customerId: joi.number().required(),
	gameId: joi.number().required(),
	daysRented: joi.number().min(1).required(),
});

const connection = new Pool({
	user: "bootcamp_role",
	password: "senha_super_hiper_ultra_secreta_do_role_do_bootcamp",
	host: "localhost",
	port: 5432,
	database: "boardcamp",
});

app.get("/categories", async (req, res) => {
	try {
		const categoriesList = await connection.query("SELECT * FROM categories");
		return res.status(200).send(categoriesList.rows);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

app.post("/categories", async (req, res) => {
	try {
		const validation = categorySchema.validate(req.body);
		if (validation.error) return res.sendStatus(400);

		const { name } = req.body;

		const duplicateCheck = await connection.query("SELECT * FROM categories WHERE name ILIKE $1;", [
			name,
		]);
		if (duplicateCheck.rows.length !== 0) return res.sendStatus(409);

		await connection.query("INSERT INTO categories (name) VALUES ($1);", [name]);

		return res.status(200).send(req.body);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

app.get("/games", async (req, res) => {
	try {
		let gamesList;

		if (req.query.name) {
			gamesList = await connection.query("SELECT * FROM games WHERE name ILIKE $1;", [
				`${req.query.name}%`,
			]);
		} else {
			gamesList = await connection.query("SELECT * FROM games;");
		}

		return res.status(200).send(gamesList.rows);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.post("/games", async (req, res) => {
	try {
		const validation = gameSchema.validate(req.body);
		if (validation.error) return res.sendStatus(400);

		const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

		const duplicateCheck = await connection.query("SELECT * FROM games WHERE name ILIKE $1;", [
			name,
		]);
		if (duplicateCheck.rows.length !== 0) return res.sendStatus(409);

		const categoryCheck = await connection.query("SELECT * FROM categories WHERE id = $1;", [
			categoryId,
		]);
		if (categoryCheck.rows.length === 0) return res.sendStatus(400);

		await connection.query(
			`INSERT INTO games (name,image,"stockTotal","categoryId","pricePerDay") 
			        VALUES ($1,$2,$3,$4,$5);`,
			[name, image, stockTotal, categoryId, pricePerDay]
		);

		return res.status(200).send(req.body);
	} catch (err) {
		return res.sendStatus(500);
	}
});

app.get("/customers", async (req, res) => {
	try {
		const { cpf } = req.query;
		let customersList;

		if (req.query.cpf) {
			customersList = await connection.query("SELECT * FROM customers WHERE cpf ILIKE $1;", [
				`${req.query.cpf}%`,
			]);
		} else {
			customersList = await connection.query("SELECT * FROM customers;");
		}

		return res.status(200).send(customersList.rows);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.get("/customers/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const customersList = await connection.query("SELECT * FROM customers WHERE id = $1;", [id]);
		if (customersList.rows.length === 0) return res.sendStatus(404);

		return res.status(200).send(customersList.rows);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.post("/customers", async (req, res) => {
	try {
		const validation = customerSchema.validate(req.body);
		if (validation.error) return res.sendStatus(400);
		console.log("gabru");
		const { name, phone, cpf, birthday } = req.body;

		const duplicateCheck = await connection.query("SELECT * FROM customers WHERE cpf = $1;", [cpf]);
		if (duplicateCheck.rows.length !== 0) {
			console.log(duplicateCheck.rows);
			return res.sendStatus(409);
		}

		await connection.query(
			`INSERT INTO customers (name, phone, cpf, birthday)
             	VALUES ($1, $2, $3, $4);`,
			[name, phone, cpf, birthday]
		);

		return res.sendStatus(201);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.put("/customers/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { name, phone, cpf, birthday } = req.body;

		const validation = customerSchema.validate(req.body);
		if (validation.error) return res.sendStatus(400);

		const idExistsCheck = connection.query("SELECT * FROM customers WHERE id = $1;", [id]);
		if (idExistsCheck.rows.length === 0) return res.sendStatus(404);

		const cpfCheck = connection.query("SELECT * FROM customers WHERE cpf = $1;", [cpf]);
		if (cpfCheck.rows.length !== 0 && cpfCheck.rows[0].id !== id) return res.sendStatus(409);

		await connection.query(
			`UPDATE 
                customers
             	SET (name = $1,phone = $2,cpf = $3, birthday = $4)
             	WHERE id = $5;`,
			[name, phone, cpf, birthday, id]
		);

		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get("/rentals", async (req, res) => {
	try {
		const { customerId, gameId } = req.query;

		const retalsList = await connection.query(`
			SELECT  rentals.*,
					customers.id AS customer_id,
					customers.name AS customer_name,
					games.id AS game_id,
					games.name AS game_name,
					categories.id AS category_id,
					categories.name AS category_name FROM rentals 
			JOIN customers ON rentals."customerId" = customers.id 
			JOIN games ON rentals."gameId" = games.id 
			JOIN categories ON games."categoryId" = categories.id
			;`);

		let rentalsArray = retalsList.rows;

		if (customerId) {
			console.log("aaa");
			rentalsArray = rentalsArray.filter((obj) => obj.customerId === Number(customerId));
		}
		if (gameId) {
			rentalsArray = rentalsArray.filter((obj) => obj.gameId === Number(gameId));
		}

		const finalResponse = rentalsArray.map((obj) => ({
			id: obj.id,
			customerId: obj.customerId,
			gameId: obj.gameId,
			rentDate: obj.rentDate,
			daysRented: obj.daysRented,
			returnDate: obj.returnDate,
			originalPrice: obj.originalPrice,
			delayFee: obj.delayFee,
			customer: {
				id: obj.customer_id,
				name: obj.customer_name,
			},
			game: {
				id: obj.game_id,
				name: obj.game_name,
				categoryId: obj.category_id,
				categoryName: obj.category_name,
			},
		}));
		return res.send(finalResponse);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.post("/rentals", async (req, res) => {
	try {
		const validation = rentalSchema.validate(req.body);
		if (validation.error) return res.sendStatus(400);

		const { customerId, gameId, daysRented } = req.body;

		const customerExistsCheck = await connection.query("SELECT * FROM customers WHERE id = $1;", [
			customerId,
		]);
		const gameExistsCheck = await connection.query("SELECT * FROM games WHERE id = $1;", [gameId]);
		const gameRentedCheck = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1;', [
			gameId,
		]);

		console.log(customerExistsCheck.rows, gameExistsCheck.rows, gameRentedCheck.rows);

		if (
			customerExistsCheck.rows.length === 0 ||
			gameExistsCheck.rows.length === 0 ||
			gameRentedCheck.rows.length >= gameExistsCheck.rows[0].stockTotal
		)
			return res.sendStatus(400);

		const rentDate = dayjs().format("YYYY-MM-DD");
		const originalPrice = Number(daysRented) * Number(gameExistsCheck.rows[0].pricePerDay);

		await connection.query(
			`
            INSERT INTO rentals 
                ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
            VALUES
                ($1, $2, $3, $4, NULL, $5, NULL);`,
			[customerId, gameId, rentDate, daysRented, originalPrice]
		);

		return res.sendStatus(201);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.post("/rentals/:id/return", async (req, res) => {
	try {
		const { id } = req.params;
		const checkIdExists = await connection.query("SELECT * FROM rentals WHERE id = $1", [id]);

		if (checkIdExists.rows.length === 0) return res.sendStatus(400);

		if (checkIdExists.rows[0].returnDate !== null) return sendStatus(400);

		const rentalObject = checkIdExists.rows[0];

		const returnDate = dayjs();
		const rentDateObject = dayjs(rentalObject.rentDate, "YYYY-MM-DD");

		const delayFee =
			Math.floor((returnDate - rentDateObject) / (60 * 60 * 24 * 1000)) *
			(rentalObject.originalPrice / rentalObject.daysRented);

		console.log(rentDateObject);

		await connection.query(
			`UPDATE 
                rentals
             SET
                "delayFee" = $1,
                "returnDate" = $2
             WHERE
                id = $3`,
			[delayFee, returnDate.format("YYYY-MM-DD"), id]
		);

		return res.sendStatus(200);
	} catch (err) {
		return res.sendStatus(500);
	}
});

app.delete("/rentals/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const checkIdExists = await connection.query("SELECT * FROM rentals WHERE id = $1;", [id]);
		if (checkIdExists.rows.length === 0) return res.sendStatus(404);

		if (checkIdExists.rows[0].returnDate !== null) return res.sendStatus(400);

		await connection.query("DELETE FROM rentals WHERE id = $1;", [id]);
		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		return res.sendStatus(500);
	}
});

app.listen(4000);
