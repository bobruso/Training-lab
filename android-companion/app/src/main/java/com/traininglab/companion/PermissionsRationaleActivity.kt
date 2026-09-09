package com.traininglab.companion

import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity

class PermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            textSize = 16f
            setPadding(48, 48, 48, 48)
            text = """
                Training Lab — uso de datos de Health Connect

                Training Lab solicita únicamente datos necesarios para tu seguimiento personal: sueño, sesiones de ejercicio, frecuencia cardíaca, HRV, frecuencia cardíaca en reposo, distancia y calorías.

                Estos datos se usan para calcular tendencias de sueño, recuperación, carga, rendimiento y para adaptar tu planificación. Se sincronizan con tu cuenta privada de Training Lab en Supabase y están protegidos por controles de acceso por usuario.

                Training Lab no vende estos datos ni los publica. Puedes revocar los permisos desde Health Connect en cualquier momento.

                Esta primera versión es una herramienta personal de entrenamiento y no sustituye una valoración médica.
            """.trimIndent()
        }
        setContentView(ScrollView(this).apply { addView(text) })
    }
}
