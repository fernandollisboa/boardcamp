import pg from "pg";
import express from "express";
import joi from "joi";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
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


const customersSchema = joi.object({
	
})

const userSchema = joi.object({
	username: joi.string().alphanum().min(3).max(30).required(),
	email: joi.string().email().required(),
	password: joi.string().min(6).required(),
	passwordConfirmation: joi.ref("password"),
	birthYear: joi.number().integer().min(1900).max(2013),
	birthday: joi
		.string()
		.required()
		.pattern(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/),
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

		const newCategory = await connection.query("INSERT INTO categories (name) VALUES ($1);", [
			name,
		]);

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

		console.log("gabrueru");
		const newGame = await connection.query(
			`INSERT INTO games (name,image,"stockTotal","categoryId","pricePerDay") 
													   VALUES ($1,$2,$3,$4,$5);`,
			[name, image, stockTotal, categoryId, pricePerDay]
		);

		console.log("gabrueru");
		return res.status(200).send(req.body);
	} catch (err) {
		return res.sendStatus(500);
	}
});

app.get("/customers", (req,res)=>{
	try{
		const validation = 
	}
})

app.listen(4000);
