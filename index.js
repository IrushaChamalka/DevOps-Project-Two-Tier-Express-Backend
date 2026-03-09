import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import 'dotenv/config'

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});


const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const authSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});

const Auth = mongoose.model("Auth", authSchema);

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    const auth = new Auth({ name, email, password });
    await auth.save();
    res.status(201).json({ message: "User registered successfully" });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const auth = await Auth.findOne({ email, password });
    if (auth) {
        res.status(200).json({ message: "User logged in successfully" });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

try {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);   
    });
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
} catch (error) {
    console.log(error);
}

