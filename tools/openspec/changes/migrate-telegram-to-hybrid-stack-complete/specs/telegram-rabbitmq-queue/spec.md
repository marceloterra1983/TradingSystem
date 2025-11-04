---
capability-id: telegram-rabbitmq-queue
capability-type: NEW
status: proposal
domain: infrastructure
tags: [telegram, message-queue, rabbitmq, pub-sub, decoupling]
---

# Specification: RabbitMQ Event Bus for Telegram

## Purpose

Provide optional message queue layer to decouple Telegram Gateway from consumers using pub/sub pattern, enabling multiple consumers and improving resilience through message persistence and retry logic.

---

## ADDED Requirements

### Requirement: Message Queue Infrastructure

The system SHALL deploy RabbitMQ with management plugin to provide event bus capabilities for Telegram messages.

#### Scenario: RabbitMQ container initialization

- **WHEN** Telegram stack starts with RabbitMQ enabled
- **THEN** a container named `telegram-rabbitmq` SHALL be created
- **AND** expose AMQP port 5672 and management UI port 15672
- **AND** create virtual host `telegram`
- **AND** configure user `telegram` with password from `.env`
- **AND** enable management plugin for UI access

#### Scenario: Exchange and queue topology setup

- **WHEN** Gateway service initializes queue client
- **THEN** it SHALL create topic exchange `telegram.messages`
- **AND** declare durable queues with routing keys `telegram.channel.{channel_id}`
- **AND** create dead letter queue `telegram.messages.dlq`
- **AND** configure DLQ with 24-hour TTL and max 10,000 messages

---

### Requirement: Message Publishing

The Gateway SHALL publish all received messages to RabbitMQ for asynchronous consumption by interested services.

#### Scenario: Publish message to queue

- **WHEN** Gateway receives new Telegram message
- **THEN** Gateway SHALL publish message to exchange `telegram.messages`
- **AND** use routing key `telegram.channel.{channel_id}`
- **AND** set message properties: `persistent=true`, `contentType=application/json`
- **AND** include headers: `x-source=telegram-gateway`, `x-channel-id={channel_id}`
- **AND** complete publish operation in <5ms

#### Scenario: Publish failure handling

- **WHEN** RabbitMQ is unavailable or publish fails
- **THEN** Gateway SHALL retry up to 3 times with exponential backoff
- **AND** log failure after all retries exhausted
- **AND** fall back to database-only mode (no queue)
- **AND** increment metric `rabbitmq_publish_failures_total`

---

### Requirement: Message Consumption

TP Capital and other consumers SHALL subscribe to channel-specific queues to receive messages asynchronously.

#### Scenario: Subscribe to channel messages

- **WHEN** TP Capital starts queue consumer
- **THEN** consumer SHALL create queue `telegram.consumer.tp-capital.{channel_id}`
- **AND** bind queue to exchange with routing key `telegram.channel.{channel_id}`
- **AND** set prefetch count to 10 (limit unacked messages)
- **AND** consume messages with manual acknowledgment mode

#### Scenario: Message processing and acknowledgment

- **WHEN** consumer receives message from queue
- **THEN** consumer SHALL process message (parse signal, insert to DB)
- **AND** acknowledge message (`channel.ack`) on success
- **AND** reject message (`channel.nack`) on failure
- **AND** retry failed messages up to 3 times
- **AND** send to DLQ after 3 failures

---

### Requirement: Dead Letter Queue Handling

The system SHALL capture failed messages in dead letter queue for manual inspection and recovery.

#### Scenario: Message sent to DLQ after max retries

- **WHEN** message processing fails 3 times
- **THEN** RabbitMQ SHALL route message to `telegram.messages.dlq`
- **AND** preserve original message headers and body
- **AND** add header `x-death` with failure reason and count
- **AND** retain message for 24 hours

#### Scenario: DLQ monitoring and alerts

- **WHEN** DLQ contains >100 messages
- **THEN** Prometheus alert `DeadLetterQueueBuilding` SHALL fire
- **AND** operator SHALL investigate via RabbitMQ Management UI
- **AND** messages can be requeued manually after fixing issues

---

### Requirement: Optional Deployment

RabbitMQ SHALL be optional component that can be disabled without affecting core Telegram functionality.

#### Scenario: Queue disabled (polling mode)

- **WHEN** environment variable `TELEGRAM_ENABLE_QUEUE=false`
- **THEN** Gateway SHALL skip RabbitMQ initialization
- **AND** TP Capital SHALL use database polling only
- **AND** system SHALL function normally without queue

#### Scenario: Queue enabled for multiple consumers

- **WHEN** environment variable `TELEGRAM_ENABLE_QUEUE=true`
- **AND** multiple consumers need Telegram messages (TP Capital + Analytics + Alerts)
- **THEN** Gateway SHALL publish messages to queue
- **AND** each consumer SHALL create own queue and bind to exchange
- **AND** messages SHALL be delivered to all subscribed consumers
- **AND** consumers SHALL operate independently (one failure doesn't affect others)

---

### Requirement: Management and Observability

RabbitMQ SHALL provide management UI and expose metrics for operational monitoring.

#### Scenario: Access management UI

- **WHEN** operator navigates to `http://localhost:15672`
- **THEN** RabbitMQ Management UI SHALL load
- **AND** accept credentials (telegram / password from .env)
- **AND** display queues, exchanges, connections, channels
- **AND** allow manual message inspection and requeue

#### Scenario: Metrics export to Prometheus

- **WHEN** Prometheus scrapes RabbitMQ management plugin
- **THEN** RabbitMQ SHALL expose metrics on `/metrics` endpoint
- **AND** include: `rabbitmq_queue_messages_ready`, `rabbitmq_queue_messages_unacknowledged`
- **AND** include: `rabbitmq_queue_consumers`, `rabbitmq_channel_messages_published_total`
- **AND** Grafana dashboard SHALL visualize queue depth, publish/deliver rates

