package com.financeflow.smsparser

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Telephony
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

private const val SERVER_URL = "http://192.168.1.19:5000/api/transactions"

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

        for (sms in messages) {
            val body = sms.messageBody ?: continue
            val transactionJson = parseSmsToJson(body) ?: continue

            CoroutineScope(Dispatchers.IO).launch {
                sendToBackend(transactionJson)
            }
        }
    }

    private fun parseSmsToJson(body: String): JSONObject? {
        val debitWords = Regex("(?i)(debited|deducted|spent|paid|withdrawn|purchase)")
        if (!debitWords.containsMatchIn(body)) return null

        val amountPattern = Pattern.compile("(?i)(?:Rs\\.?\\s*|INR\\s*)([\\d,]+(?:\\.\\d{1,2})?)")
        val matcher = amountPattern.matcher(body)

        if (!matcher.find()) return null

        val amount = matcher.group(1)
            ?.replace(",", "")
            ?.toDoubleOrNull()
            ?: return null

        val merchant = Regex("(?i)(?:to|at|for)\\s+([A-Za-z0-9 &._-]{2,40})")
            .find(body)
            ?.groupValues
            ?.getOrNull(1)
            ?.trim()
            ?: "Unknown"

        val lower = body.lowercase(Locale.getDefault())

        val platform = when {
            lower.contains("gpay") || lower.contains("google pay") -> "GPay"
            lower.contains("phonepe") -> "PhonePe"
            lower.contains("paytm") -> "Paytm"
            lower.contains("card") -> "Card"
            lower.contains("atm") || lower.contains("cash") -> "Cash"
            else -> "UPI"
        }

        val category = when {
            lower.contains("zomato") || lower.contains("swiggy") || lower.contains("food") -> "Food"
            lower.contains("amazon") || lower.contains("flipkart") || lower.contains("shopping") -> "Shopping"
            lower.contains("uber") || lower.contains("ola") || lower.contains("travel") -> "Travel"
            lower.contains("medical") || lower.contains("pharmacy") || lower.contains("hospital") -> "Health"
            else -> "Other"
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        return JSONObject().apply {
            put("amount", amount)
            put("platform", platform)
            put("type", platform)
            put("source", "SMS")
            put("merchant", merchant)
            put("category", category)
            put("date", today)
            put("note", body)
        }
    }

    private fun sendToBackend(json: JSONObject) {
        try {
            val conn = URL(SERVER_URL).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")

            conn.outputStream.use {
                it.write(json.toString().toByteArray())
            }

            conn.responseCode
            conn.disconnect()
        } catch (_: Exception) {
        }
    }
}

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val text = TextView(this).apply {
            text = "FinanceFlow SMS Running ✅"
            textSize = 22f
            setPadding(40, 80, 40, 40)
        }

        setContentView(text)
        requestPermission()
    }

    private fun requestPermission() {
        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.READ_SMS
                ),
                101
            )
        }
    }
}