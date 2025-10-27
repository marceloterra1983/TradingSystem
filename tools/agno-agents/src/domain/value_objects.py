from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field, ValidationError, field_validator


class Symbol(BaseModel):
    model_config = {"frozen": True}

    ticker: str = Field(...)
    exchange: str = Field(...)

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Ticker cannot be empty")
        return value.strip().upper()

    @field_validator("exchange")
    @classmethod
    def validate_exchange(cls, value: str) -> str:
        normalized = value.strip().upper()
        return normalized

    def __str__(self) -> str:
        return f"{self.ticker}:{self.exchange}"


class Price(BaseModel):
    model_config = {"frozen": True}

    value: Decimal = Field(...)
    currency: str = Field(default="BRL")

    @field_validator("value")
    @classmethod
    def validate_value(cls, val: Decimal) -> Decimal:
        if val <= 0:
            raise ValueError("Price value must be positive")
        return val

    def __add__(self, other: "Price") -> "Price":
        self._assert_same_currency(other)
        return Price(value=self.value + other.value, currency=self.currency)

    def __sub__(self, other: "Price") -> "Price":
        self._assert_same_currency(other)
        return Price(value=self.value - other.value, currency=self.currency)

    def __mul__(self, factor: Decimal | float | int) -> "Price":
        numeric = Decimal(str(factor))
        return Price(value=self.value * numeric, currency=self.currency)

    def _assert_same_currency(self, other: "Price") -> None:
        if self.currency != other.currency:
            raise ValueError("Currency mismatch between prices")


class Confidence(BaseModel):
    model_config = {"frozen": True}

    score: float = Field(...)

    @field_validator("score")
    @classmethod
    def validate_score(cls, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise ValueError("Confidence score must be between 0.0 and 1.0")
        return value

    @property
    def percentage(self) -> float:
        return self.score * 100

    @property
    def level(self) -> str:
        if self.score >= 0.7:
            return "HIGH"
        if self.score >= 0.4:
            return "MEDIUM"
        return "LOW"
