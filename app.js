
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const PDFDocument = require('pdfkit');

const app = express();

// --- CONFIGURACIONES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración de Sesión
app.use(session({
    secret: 'nike_super_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 horas
}));

// Middleware Global (Usuario y Carrito disponibles en todas las vistas)
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart;
    // Calcular total global para el navbar
    res.locals.cartTotal = req.session.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    next();
});

// --- RUTAS ---

// 1. Catálogo (Home)
app.get('/', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.log(err);
            res.send("Error al obtener productos");
        } else {
            res.render('index', { products: results });
        }
    });
});

// 2. Login (Vista)
app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

// 3. Login (Procesar)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // NOTA: Para un proyecto real, usa bcrypt para encriptar passwords.
    // Aquí comparamos texto plano por simplicidad escolar.
    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.render('login', { message: 'Correo o contraseña incorrectos' });
        }
    });
});

// 4. Registro (Vista y Procesar)
app.get('/register', (req, res) => res.render('register'));

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    db.query('INSERT INTO users SET ?', { username, email, password }, (err) => {
        if(err) return res.send("Error al registrar: " + err.message);
        res.redirect('/login');
    });
});

// 5. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 6. Agregar al Carrito
app.post('/add-to-cart', (req, res) => {
    const { id, name, price, image } = req.body;
    const existingProduct = req.session.cart.find(p => p.id == id);

    if (existingProduct) {
        existingProduct.quantity++;
    } else {
        req.session.cart.push({
            id, 
            name, 
            price: parseFloat(price), 
            image, 
            quantity: 1 
        });
    }
    res.redirect('/');
});

// 7. Ver Carrito
app.get('/cart', (req, res) => {
    res.render('cart');
});

// 8. Actualizar Carrito (API para AJAX)
app.post('/update-cart', (req, res) => {
    const { id, action } = req.body;
    const product = req.session.cart.find(p => p.id == id);
    
    if (product) {
        if (action === 'increase') product.quantity++;
        if (action === 'decrease') {
            product.quantity--;
            if (product.quantity <= 0) {
                req.session.cart = req.session.cart.filter(p => p.id != id);
            }
        }
        if (action === 'remove') {
             req.session.cart = req.session.cart.filter(p => p.id != id);
        }
    }
    res.json({ success: true });
});

// 9. Checkout y PDF
app.post('/checkout', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.cart.length === 0) return res.redirect('/');

    const cart = req.session.cart;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const userId = req.session.user.id;

    db.query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total], (err, result) => {
        if (err) return res.send("Error al procesar la orden");

        const orderId = result.insertId;
        const orderDate = new Date().toLocaleString();

        // Insertar detalles
        cart.forEach(item => {
            db.query('INSERT INTO order_details (order_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.name, item.quantity, item.price, item.price * item.quantity]);
        });

        // Generar PDF
        const doc = new PDFDocument();
        const filename = `Nike_Ticket_${orderId}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);
        
        // Diseño del Ticket
        doc.font('Helvetica-Bold').fontSize(20).text('FerxxoLover', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Ticket de Compra #${orderId}`);
        doc.text(`Cliente: ${req.session.user.username}`);
        doc.text(`Fecha: ${orderDate}`);
        doc.text('--------------------------------------------------');
        doc.moveDown();

        cart.forEach(item => {
            doc.text(`${item.name} (x${item.quantity})`);
            doc.text(`Precio Unit: $${item.price} | Subtotal: $${item.price * item.quantity}`, { align: 'right' });
            doc.moveDown(0.5);
        });

        doc.text('--------------------------------------------------');
        doc.font('Helvetica-Bold').fontSize(16).text(`TOTAL PAGADO: $${total}`, { align: 'right' });
        doc.end();

        // Vaciar carrito después de generar el PDF
        req.session.cart = [];
    });
});

// 10. Historial
app.get('/history', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const query = 'SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [req.session.user.id], (err, orders) => {
        res.render('history', { orders });
    });
});

// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log('Servidor corriendo en puerto ${PORT}');
});