package com.financeflow.smsparser

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — update SERVER_URL with your backend IP/domain
// ─────────────────────────────────────────────────────────────────────────────
private const val SERVER_URL = "http://192.168.1.100:5000/api/transactions"
private const val TAG        = "FinanceFlow-SMS"
private const val SMS_PERM_CODE = 101

// ─────────────────────────────────────────────────────────────────────────────
// Data class representing a parsed transaction
// ─────────────────────────────────────────────────────────────────────────────
data class ParsedTransaction(
    val amount:   Double,
    val platform: String,   // UPI | Card | Cash
    val merchant: String?,
    val date:     String,   // YYYY-MM-DD
)

// ─────────────────────────────────────────────────────────────────────────────
// SMS Parser — regex-based, covers most Indian bank SMS formats
// ─────────────────────────────────────────────────────────────────────────────
object SmsParser {

    // Matches: Rs 500, Rs. 500, INR 500, INR500, Rs500
    private val AMOUNT_PATTERN: Pattern = Pattern.compile(
        """(?i)(?:Rs\.?\s*|INR\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)"""
    )

    // Matches "debited" or "deducted" (we only track debits)
    private val DEBIT_PATTERN: Pattern = Pattern.compile(
        """(?i)\b(debited|deducted|spent|paid|withdrawn)\b"""
    )

    // Matches UPI reference
    private val UPI_PATTERN: Pattern = Pattern.compile(
        """(?i)\b(UPI|IMPS|NEFT|GPay|PhonePe|Paytm|Bhim)\b"""
    )

    // Matches Card transactions
    private val CARD_PATTERN: Pattern = Pattern.compile(
        """(?i)\b(card|credit card|debit card|ATM)\b"""
    )

    // Merchant name after "to " or "at " — e.g. "to Amazon", "at Zomato"
    private val MERCHANT_PATTERN: Pattern = Pattern.compile(
        """(?i)(?:to|at|for)\s+([A-Za-z][A-Za-z0-9 &._-]{1,40})"""
    )

    fun parse(smsBody: String): ParsedTransaction? {
        // Must be a debit SMS
        if (!DEBIT_PATTERN.matcher(smsBody).find()) return null

        // Extract amount
        val amountMatcher = AMOUNT_PATTERN.matcher(smsBody)
        if (!amountMatcher.find()) return null
        val amountStr = amountMatcher.group(1)?.replace(",", "") ?: return null
        val amount    = amountStr.toDoubleOrNull() ?: return null
        if (amount <= 0) return null

        // Determine platform
        val platform = when {
            UPI_PATTERN.matcher(smsBody).find()  -> "UPI"
            CARD_PATTERN.matcher(smsBody).find() -> "Card"
            else                                 -> "Cash"
        }

        // Extract merchant (best-effort)
        val merchantMatcher = MERCHANT_PATTERN.matcher(smsBody)
        val merchant = if (merchantMatcher.find()) {
            merchantMatcher.group(1)?.trim()?.take(50)
        } else null

        val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        Log.d(TAG, "Parsed: amount=$amount platform=$platform merchant=$merchant")
        return ParsedTransaction(amount, platform, merchant, date)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BroadcastReceiver — listens for incoming SMS
// ─────────────────────────────────────────────────────────────────────────────
class SmsBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages: Array<SmsMessage> = Telephony.Sms.Intents.getMessagesFromIntent(intent)

        for (sms in messages) {
            val body   = sms.messageBody ?: continue
            val sender = sms.originatingAddress ?: ""

            Log.d(TAG, "SMS from [$sender]: $body")

            val transaction = SmsParser.parse(body) ?: continue

            // Send to backend in a background coroutine
            CoroutineScope(Dispatchers.IO).launch {
                sendTransactionToBackend(transaction)
            }
        }
    }

    private suspend fun sendTransactionToBackend(t: ParsedTransaction) {
        try {
            val payload = JSONObject().apply {
                put("amount",   t.amount)
                put("platform", t.platform)
                put("type",     t.platform)   // backward-compat field
                put("source",   "SMS")
                put("merchant", t.merchant ?: JSONObject.NULL)
                put("date",     t.date)
                put("category", "Other")       // default; user can change in app
                put("note",     if (t.merchant != null) "Auto: ${t.merchant}" else "Auto-detected via SMS")
                put("ts",       System.currentTimeMillis())
            }

            val url  = URL(SERVER_URL)
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                requestMethod   = "POST"
                doOutput        = true
                connectTimeout  = 10_000
                readTimeout     = 10_000
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
            }

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK) {
                Log.i(TAG, "✅ Transaction sent: ₹${t.amount} via ${t.platform}")
            } else {
                Log.w(TAG, "⚠ Backend returned HTTP $responseCode")
            }

            conn.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to send transaction: ${e.message}")
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MainActivity
// ─────────────────────────────────────────────────────────────────────────────
class MainActivity : AppCompatActivity() {

    private val smsReceiver = SmsBroadcastReceiver()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestSmsPermission()
    }

    override fun onResume() {
        super.onResume()
        if (hasSmsPermission()) registerSmsReceiver()
    }

    override fun onPause() {
        super.onPause()
        try { unregisterReceiver(smsReceiver) } catch (_: Exception) {}
    }

    private fun hasSmsPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS)    == PackageManager.PERMISSION_GRANTED

    private fun requestSmsPermission() {
        val needed = arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
        if (!hasSmsPermission()) {
            ActivityCompat.requestPermissions(this, needed, SMS_PERM_CODE)
        } else {
            registerSmsReceiver()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERM_CODE && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            registerSmsReceiver()
            Log.i(TAG, "SMS permissions granted")
        } else {
            Log.w(TAG, "SMS permissions denied")
        }
    }

    private fun registerSmsReceiver() {
        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(smsReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(smsReceiver, filter)
        }
        Log.i(TAG, "SMS BroadcastReceiver registered")
    }
}
