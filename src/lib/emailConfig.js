// EmailJS Configuration
//
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
// 1. Create a FREE account at https://www.emailjs.com
// 2. Go to "Email Services" → Add a service (Gmail, Outlook, etc.) → copy the Service ID
// 3. Go to "Email Templates" → Create a template with these variables in the body:
//      To Email: {{to_email}}
//      Subject: {{subject}}
//      Content: {{message}}
//    Copy the Template ID
// 4. Go to "Account" → "API Keys" → copy your Public Key
// 5. Paste all three values below (replace the YOUR_... placeholders)

export const EMAILJS_CONFIG = {
  serviceId: 'service_e72z6q1',
  templateId: 'template_slhlv7l',
  publicKey: 'lIf1A2oKN5LRjDPfK',
};

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const verificationCodes = {};

const transporter = nodemailer.createTransport({

    service:"gmail",

    auth:{

        user:"YOUR_EMAIL@gmail.com",

        pass:"YOUR_APP_PASSWORD"

    }

});

app.post("/api/send-code", async(req,res)=>{

    const {email} = req.body;

    const code = Math.floor(100000 + Math.random()*900000);

    verificationCodes[email]=code;

    await transporter.sendMail({

        from:"YOUR_EMAIL@gmail.com",

        to:email,

        subject:"Email Verification",

        text:`Your verification code is ${code}`

    });

    res.json({

        success:true,

        message:"Verification code sent."

    });

});

app.post("/api/verify-code",(req,res)=>{

    const {email,code}=req.body;

    if(verificationCodes[email]==code){

        delete verificationCodes[email];

        return res.json({

            success:true,

            message:"Email verified."

        });

    }

    res.json({

        success:false,

        message:"Invalid verification code."

    });

});

app.listen(3000,()=>{

    console.log("Server running");

});