-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: sukha_test
-- ------------------------------------------------------
-- Server version	8.0.28

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bloqueos_agenda`
--

DROP TABLE IF EXISTS `bloqueos_agenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloqueos_agenda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profesional_id` int NOT NULL,
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `creado_por_usuario_id` int DEFAULT NULL,
  `actualizado_en` datetime DEFAULT NULL,
  `actualizado_por_usuario_id` int DEFAULT NULL,
  `eliminado_en` datetime DEFAULT NULL,
  `eliminado_por_usuario_id` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_bloq_creado_por` (`creado_por_usuario_id`),
  KEY `fk_bloq_actualizado_por` (`actualizado_por_usuario_id`),
  KEY `fk_bloq_eliminado_por` (`eliminado_por_usuario_id`),
  KEY `idx_bloq_prof_activo` (`profesional_id`,`activo`),
  CONSTRAINT `fk_bloq_actualizado_por` FOREIGN KEY (`actualizado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bloq_creado_por` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bloq_eliminado_por` FOREIGN KEY (`eliminado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bloqueo_profesional` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales` (`id`),
  CONSTRAINT `chk_bloqueo_fechas` CHECK ((`fecha_hora_inicio` < `fecha_hora_fin`))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloqueos_agenda`
--

LOCK TABLES `bloqueos_agenda` WRITE;
/*!40000 ALTER TABLE `bloqueos_agenda` DISABLE KEYS */;
INSERT INTO `bloqueos_agenda` VALUES (1,1,'2025-06-16 15:00:00','2025-06-16 17:00:00','Reunión','2026-01-08 16:31:53',NULL,NULL,NULL,NULL,NULL,1),(2,1,'2025-12-29 10:00:01','2025-12-29 12:00:01','reunión con proveedores','2026-01-08 16:31:53',NULL,NULL,NULL,NULL,NULL,1),(3,1,'2026-01-14 00:28:36','2026-01-15 00:28:36','solo prueba','2026-01-09 21:29:22',1,NULL,NULL,'2026-01-10 00:42:26',1,0);
/*!40000 ALTER TABLE `bloqueos_agenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estados_turno`
--

DROP TABLE IF EXISTS `estados_turno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_turno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(100) COLLATE utf8mb4_spanish_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estados_turno`
--

LOCK TABLES `estados_turno` WRITE;
/*!40000 ALTER TABLE `estados_turno` DISABLE KEYS */;
INSERT INTO `estados_turno` VALUES (1,'RESERVADO','Turno solicitado pero no confirmado'),(2,'CONFIRMADO','Turno confirmado'),(3,'CANCELADO','Turno cancelado'),(4,'NO_ASISTIO','Paciente no asistió'),(5,'COMPLETADO','Turno realizado');
/*!40000 ALTER TABLE `estados_turno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `horarios_laborales`
--

DROP TABLE IF EXISTS `horarios_laborales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios_laborales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profesional_id` int NOT NULL,
  `dia_semana` tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_horario_profesional` (`profesional_id`),
  CONSTRAINT `fk_horario_profesional` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales` (`id`),
  CONSTRAINT `chk_dia_semana` CHECK ((`dia_semana` between 1 and 7)),
  CONSTRAINT `chk_horas_validas` CHECK ((`hora_inicio` < `hora_fin`))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `horarios_laborales`
--

LOCK TABLES `horarios_laborales` WRITE;
/*!40000 ALTER TABLE `horarios_laborales` DISABLE KEYS */;
INSERT INTO `horarios_laborales` VALUES (1,1,1,'14:00:00','19:00:00',1),(2,1,2,'14:00:00','19:00:00',1),(3,1,3,'14:00:00','19:00:00',1),(4,1,4,'14:00:00','19:00:00',1),(5,1,5,'14:00:00','19:00:00',1),(6,2,1,'14:00:00','19:00:00',1),(7,2,2,'14:00:00','19:00:00',1),(8,2,3,'14:00:00','19:00:00',1),(9,2,4,'14:00:00','19:00:00',1),(10,2,5,'14:00:00','19:00:00',1);
/*!40000 ALTER TABLE `horarios_laborales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `turno_id` int DEFAULT NULL,
  `paciente_id` int NOT NULL,
  `canal` enum('whatsapp','telegram','sms') COLLATE utf8mb4_spanish_ci NOT NULL,
  `tipo` varchar(30) COLLATE utf8mb4_spanish_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_spanish_ci NOT NULL,
  `programada_para` datetime NOT NULL,
  `estado` enum('PENDIENTE','ENVIADA','FALLIDA','CANCELADA') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'PENDIENTE',
  `intentos` int NOT NULL DEFAULT '0',
  `ultimo_error` text COLLATE utf8mb4_spanish_ci,
  `proveedor_msg_id` varchar(100) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enviada_en` datetime DEFAULT NULL,
  `cancelada_en` datetime DEFAULT NULL,
  `dedupe_key` varchar(120) COLLATE utf8mb4_spanish_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_dedupe` (`dedupe_key`),
  KEY `fk_notif_paciente` (`paciente_id`),
  KEY `idx_notif_pendiente` (`estado`,`programada_para`),
  KEY `idx_notif_turno` (`turno_id`),
  CONSTRAINT `fk_notif_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `fk_notif_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (1,12,3,'whatsapp','SOLICITUD_CONFIRMACION','Hola Facundo Nieto. Tenés una reserva para kinesiología con Nieto, Victoria el 2025-12-30 16:26:41.515000+00:00. Por favor, respondé para confirmar o cancelar.','2025-12-29 16:27:12','ENVIADA',1,NULL,'stub-id','2025-12-29 16:27:12','2025-12-29 16:27:38',NULL,'turno:12:SOLICITUD_CONFIRMACION'),(2,12,3,'whatsapp','CONFIRMACION','Confirmado ✅ Facundo Nieto: tu turno con Nieto, Victoria es el 2025-12-30 16:26:42.','2025-12-29 16:29:31','ENVIADA',1,NULL,'stub-id','2025-12-29 16:29:31','2025-12-29 16:29:38',NULL,'turno:12:CONFIRMACION'),(3,12,3,'whatsapp','RECORDATORIO_2H','Recordatorio (2h) ⏰ Facundo Nieto: tu turno con Nieto, Victoria es el 2025-12-30 16:26:42.','2025-12-30 14:26:42','CANCELADA',0,NULL,NULL,'2025-12-29 16:29:31',NULL,'2025-12-29 16:32:02','turno:12:RECORDATORIO_2H'),(4,12,3,'whatsapp','CANCELACION','Cancelado ❌ Facundo Nieto: tu turno con Nieto, Victoria del 2025-12-30 16:26:42 fue cancelado.','2025-12-29 16:32:02','ENVIADA',1,NULL,'stub-id','2025-12-29 16:32:02','2025-12-29 16:32:08',NULL,'turno:12:CANCELACION'),(5,13,1,'whatsapp','SOLICITUD_CONFIRMACION','Hola Juan Pérez. Tenés una reserva para kinesiología con Bellido, Angie el 2026-01-10 00:14:55.669000+00:00. Por favor, respondé para confirmar o cancelar.','2026-01-10 00:15:19','ENVIADA',1,NULL,'stub-id','2026-01-10 00:15:19','2026-01-10 00:15:30',NULL,'turno:13:SOLICITUD_CONFIRMACION'),(6,14,3,'whatsapp','SOLICITUD_CONFIRMACION','Hola Facundo Nieto. Tenés una reserva para kinesiología con Amarilo, Leonor el 2026-01-13 17:14:55.669000+00:00. Por favor, respondé para confirmar o cancelar.','2026-01-10 00:22:38','ENVIADA',1,NULL,'stub-id','2026-01-10 00:22:38','2026-01-10 00:22:55',NULL,'turno:14:SOLICITUD_CONFIRMACION'),(7,15,1,'whatsapp','SOLICITUD_CONFIRMACION','Hola Juan Pérez. Tenés una reserva para kinesiología con Nieto, Victoria el 2026-01-13 15:14:55.669000+00:00. Por favor, respondé para confirmar o cancelar.','2026-01-10 00:23:34','ENVIADA',1,NULL,'stub-id','2026-01-10 00:23:34','2026-01-10 00:23:55',NULL,'turno:15:SOLICITUD_CONFIRMACION'),(8,14,3,'whatsapp','CANCELACION','Cancelado ❌ Facundo Nieto: tu turno con Amarilo, Leonor del 2026-01-13 17:14:56 fue cancelado.','2026-01-10 00:25:20','ENVIADA',1,NULL,'stub-id','2026-01-10 00:25:20','2026-01-10 00:25:25',NULL,'turno:14:CANCELACION'),(9,15,1,'whatsapp','CANCELACION','Cancelado ❌ Juan Pérez: tu turno con Nieto, Victoria del 2026-01-13 15:14:56 fue cancelado.','2026-01-10 00:26:35','ENVIADA',1,NULL,'stub-id','2026-01-10 00:26:35','2026-01-10 00:26:55',NULL,'turno:15:CANCELACION'),(10,13,1,'whatsapp','CANCELACION','Cancelado ❌ Juan Pérez: tu turno con Bellido, Angie del 2026-01-10 00:14:56 fue cancelado.','2026-01-10 19:36:24','ENVIADA',1,NULL,'stub-id','2026-01-10 19:36:24','2026-01-10 19:36:54',NULL,'turno:13:CANCELACION');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacientes`
--

DROP TABLE IF EXISTS `pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_spanish_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_spanish_ci NOT NULL,
  `canal_contacto` enum('whatsapp','telegram','sms') COLLATE utf8mb4_spanish_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_alta` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacientes`
--

LOCK TABLES `pacientes` WRITE;
/*!40000 ALTER TABLE `pacientes` DISABLE KEYS */;
INSERT INTO `pacientes` VALUES (1,'Juan Pérez','3804123456','whatsapp',1,'2025-12-14 21:18:47'),(2,'Luciana Sosa','2974277444','whatsapp',1,'2025-12-18 16:39:08'),(3,'Facundo Nieto','3804255199','whatsapp',1,'2025-12-27 14:40:31');
/*!40000 ALTER TABLE `pacientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(80) COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perm_codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'turnos.ver','Ver turnos'),(2,'turnos.crear','Crear turnos'),(3,'turnos.confirmar','Confirmar turnos'),(4,'turnos.cancelar','Cancelar turnos'),(5,'turnos.completar','Completar turnos'),(6,'turnos.no_asistio','Marcar no asistió'),(7,'pacientes.ver','Ver pacientes'),(8,'pacientes.crear','Crear pacientes'),(9,'pacientes.editar','Editar pacientes'),(10,'agenda.bloqueos.crear','Crear bloqueos de agenda'),(11,'agenda.bloqueos.eliminar','Eliminar bloqueos de agenda'),(12,'profesionales.ver','Ver profesionales'),(13,'profesionales.crear','Crear profesionales'),(14,'profesionales.editar','Editar profesionales'),(15,'auth.usuarios.crear','Crear usuarios'),(16,'auth.usuarios.editar_roles','Editar roles de usuarios'),(17,'auth.usuarios.reset_password','Resetear password de usuarios'),(18,'agenda.bloqueos.ver','Ver bloqueos de agenda'),(19,'estados_turno.ver','Ver tipos de estado posibles para turnos');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profesionales`
--

DROP TABLE IF EXISTS `profesionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profesionales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_spanish_ci NOT NULL,
  `especialidad` varchar(100) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `duracion_turno_min` int NOT NULL DEFAULT '60',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profesionales`
--

LOCK TABLES `profesionales` WRITE;
/*!40000 ALTER TABLE `profesionales` DISABLE KEYS */;
INSERT INTO `profesionales` VALUES (1,'Amarilo, Leonor','Kinesiología',60,1),(2,'Nieto, Victoria','Estética',60,1),(3,'Bellido, Angie','Estética',45,1);
/*!40000 ALTER TABLE `profesionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recordatorios`
--

DROP TABLE IF EXISTS `recordatorios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recordatorios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `turno_id` int NOT NULL,
  `fecha_envio` datetime NOT NULL,
  `enviado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_recordatorio_turno` (`turno_id`),
  CONSTRAINT `fk_recordatorio_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recordatorios`
--

LOCK TABLES `recordatorios` WRITE;
/*!40000 ALTER TABLE `recordatorios` DISABLE KEYS */;
/*!40000 ALTER TABLE `recordatorios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol_permisos`
--

DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permisos` (
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  `scope` enum('OWN','ANY') COLLATE utf8mb4_spanish_ci NOT NULL DEFAULT 'OWN',
  PRIMARY KEY (`rol_id`,`permiso_id`,`scope`),
  KEY `fk_rp_perm` (`permiso_id`),
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol_permisos`
--

LOCK TABLES `rol_permisos` WRITE;
/*!40000 ALTER TABLE `rol_permisos` DISABLE KEYS */;
INSERT INTO `rol_permisos` VALUES (1,1,'ANY'),(3,1,'OWN'),(4,1,'OWN'),(1,2,'ANY'),(3,2,'OWN'),(1,3,'ANY'),(3,3,'OWN'),(1,4,'ANY'),(3,4,'OWN'),(4,4,'OWN'),(1,5,'ANY'),(3,5,'OWN'),(1,6,'ANY'),(3,6,'OWN'),(1,7,'ANY'),(1,8,'ANY'),(1,9,'ANY'),(1,10,'ANY'),(3,10,'OWN'),(1,11,'ANY'),(3,11,'OWN'),(1,12,'ANY'),(1,13,'ANY'),(1,14,'ANY'),(1,15,'ANY'),(1,16,'ANY'),(1,17,'ANY'),(1,18,'ANY'),(2,18,'ANY'),(3,18,'OWN'),(1,19,'ANY'),(2,19,'ANY');
/*!40000 ALTER TABLE `rol_permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rol_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','Dueña / administradora del sistema',1),(2,'RECEPCIONISTA','Recepción / secretaria',1),(3,'PROFESIONAL','Profesional que atiende',1),(4,'PACIENTE','Paciente (futuro)',1);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnos`
--

DROP TABLE IF EXISTS `turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `profesional_id` int NOT NULL,
  `estado_id` int NOT NULL,
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmado_en` datetime DEFAULT NULL,
  `cancelado_en` datetime DEFAULT NULL,
  `creado_por_usuario_id` int DEFAULT NULL,
  `actualizado_por_usuario_id` int DEFAULT NULL,
  `actualizado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_turno_unico` (`profesional_id`,`fecha_hora_inicio`),
  UNIQUE KEY `uq_paciente_mismo_inicio` (`paciente_id`,`fecha_hora_inicio`),
  KEY `fk_turno_estado` (`estado_id`),
  KEY `idx_turno_creado_por` (`creado_por_usuario_id`),
  KEY `idx_turno_actualizado_por` (`actualizado_por_usuario_id`),
  CONSTRAINT `fk_turno_actualizado_por` FOREIGN KEY (`actualizado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_turno_creado_por` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_turno_estado` FOREIGN KEY (`estado_id`) REFERENCES `estados_turno` (`id`),
  CONSTRAINT `fk_turno_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `fk_turno_profesional` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos`
--

LOCK TABLES `turnos` WRITE;
/*!40000 ALTER TABLE `turnos` DISABLE KEYS */;
INSERT INTO `turnos` VALUES (1,1,1,3,'2025-06-16 14:00:00','2025-06-16 15:00:00','2025-12-14 21:33:36',NULL,'2025-12-27 20:22:48',NULL,NULL,NULL),(7,1,1,3,'2025-12-18 15:42:46','2025-12-18 16:42:46','2025-12-18 17:52:00',NULL,'2025-12-27 20:22:48',NULL,NULL,NULL),(8,3,1,5,'2025-12-27 13:39:37','2025-12-27 14:39:37','2025-12-27 17:42:36','2025-12-27 17:44:31',NULL,NULL,NULL,NULL),(9,3,1,3,'2025-12-27 17:27:06','2025-12-27 17:29:06','2025-12-27 17:26:14',NULL,'2025-12-27 20:28:14',NULL,NULL,NULL),(10,3,1,4,'2025-12-27 17:37:06','2025-12-27 17:39:06','2025-12-27 17:30:42','2025-12-27 20:30:53',NULL,NULL,NULL,NULL),(11,3,1,3,'2025-12-29 14:00:01','2025-12-29 15:00:01','2025-12-27 21:25:50',NULL,'2025-12-27 22:26:34',NULL,NULL,NULL),(12,3,2,3,'2025-12-30 16:26:42','2025-12-30 17:26:42','2025-12-29 16:27:12','2025-12-29 16:29:31','2025-12-29 16:32:02',NULL,NULL,NULL),(13,1,3,3,'2026-01-10 00:14:56','2026-01-10 00:15:56','2026-01-10 00:15:19',NULL,'2026-01-10 19:36:24',1,1,'2026-01-10 19:36:24'),(14,3,1,3,'2026-01-13 17:14:56','2026-01-13 18:15:56','2026-01-10 00:22:38',NULL,'2026-01-10 00:25:20',1,2,'2026-01-10 00:25:20'),(15,1,2,3,'2026-01-13 15:14:56','2026-01-13 16:15:56','2026-01-10 00:23:34',NULL,'2026-01-10 00:26:35',1,3,'2026-01-10 00:26:35');
/*!40000 ALTER TABLE `turnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario_roles`
--

DROP TABLE IF EXISTS `usuario_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_roles` (
  `usuario_id` int NOT NULL,
  `rol_id` int NOT NULL,
  PRIMARY KEY (`usuario_id`,`rol_id`),
  KEY `fk_ur_rol` (`rol_id`),
  CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_roles`
--

LOCK TABLES `usuario_roles` WRITE;
/*!40000 ALTER TABLE `usuario_roles` DISABLE KEYS */;
INSERT INTO `usuario_roles` VALUES (1,1),(4,1),(2,3),(3,3);
/*!40000 ALTER TABLE `usuario_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(60) COLLATE utf8mb4_spanish_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_spanish_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `profesional_id` int DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_login_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_usuario_profesional` (`profesional_id`),
  CONSTRAINT `fk_usuario_profesional` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','admin@local.com','$2b$12$kHdfk1bpPjOqG80TUSJI1Obo65hKgIDmlKnTbSAV4kWqBZX0vEXDy',1,NULL,'2026-01-09 20:38:02',NULL),(2,'prof1','prof1@local.com','$2b$12$uARE9rzhqsowx69L381wteK.hKRvXo3z657ZoUWowtBIPZeuuW8WG',1,1,'2026-01-09 20:41:45',NULL),(3,'prof2','prof2@local.com','$2b$12$V5QEX8ql3yjm5mPFCG0Cx.xQVShIiFze1Pnv1SiCtZ8kbbzJ8kiKy',1,2,'2026-01-09 21:18:59',NULL),(4,'recep1','recep1@gmail.com','$2b$12$.evRq8roDi8uJVeWfUXfoesBf64UnfFLlvormLFx/NyokgmVBi.gC',1,NULL,'2026-01-10 17:25:58',NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'sukha_test'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-13 19:06:17
