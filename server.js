const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Подключено к MongoDB"))
  .catch((err) => console.error("❌ Ошибка подключения к MongoDB:", err));

const LatLngSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
});

// Схема для хранения улиц
const streetSchema = new mongoose.Schema({
  name: String,
  coordinates: [[Object]],
  bounds: {
    _northEast: { lat: Number, lng: Number },
    _southWest: { lat: Number, lng: Number },
  },
  color: String,
});

const lineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: "#009900" },
  polyline: { type: [LatLngSchema], required: true }, // Хранение массива точек линии
});

const Street = mongoose.model("Street", streetSchema);
const Line = mongoose.model("Line", lineSchema);

// 🔹 Получить все улицы
app.get("/streets", async (req, res) => {
  try {
    const lines = await Street.find();
    res.json(lines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Добавить новую улицу
app.post("/streets", async (req, res) => {
  try {
    const { name, coordinates, bounds, color } = req.body;
    const newLine = new Street({ name, coordinates, bounds, color });
    await newLine.save();
    res.json(newLine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/update-color", async (req, res) => {
  const { id, color } = req.body;
  if (!id || !color)
    return res
      .status(400)
      .json({ success: false, error: "Некорректные данные" });

  try {
    const updatedStreet = await Street.findOneAndUpdate(
      { _id: id },
      { color },
      { new: true } // Возвращает обновленный объект
    );

    if (!updatedStreet)
      return res
        .status(404)
        .json({ success: false, error: "Улица не найдена" });

    res.json({ success: true, color: updatedStreet.color });
  } catch (error) {
    console.error("Ошибка обновления:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

// Сохранение нарисованной линии
app.post("/api/save-line", async (req, res) => {
  const { name, polyline, color } = req.body;
  console.log(req.body);

  if (!polyline || !color) {
    return res
      .status(400)
      .json({ success: false, error: "Некорректные данные" });
  }

  try {
    const newStreet = new Line({ name, polyline, color });
    await newStreet.save();

    res.json({ success: true, id: newStreet._id });
  } catch (error) {
    console.error("Ошибка сохранения:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

app.get("/api/get-lines", async (req, res) => {
  try {
    const lines = await Line.find();
    res.json(lines);
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

// 🔹 Удалить линию
app.delete("/api/delete-line/:id", async (req, res) => {
    try {
      await Line.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// 🔹 Удалить улицу
app.delete("/streets/:id", async (req, res) => {
  try {
    await Street.findByIdAndDelete(req.params.id);
    res.json({ message: "Улица удалена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Запуск сервера
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
