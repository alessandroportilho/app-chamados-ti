import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import App from "../App";

describe("Interface da aplicação", () => {

  test("renderiza os elementos da tela de login", () => {
    const { getByText, getByPlaceholderText } = render(<App />);

    expect(getByText("HelpDesk TI")).toBeTruthy();

    expect(
      getByPlaceholderText("E-mail corporativo")
    ).toBeTruthy();

    expect(
      getByPlaceholderText("Senha")
    ).toBeTruthy();

    expect(
      getByText("Acessar Painel")
    ).toBeTruthy();
  });

  test("permite digitar nos campos", () => {
    const { getByPlaceholderText } = render(<App />);

    const emailInput = getByPlaceholderText("E-mail corporativo");
    const senhaInput = getByPlaceholderText("Senha");

    fireEvent.changeText(emailInput, "teste@email.com");
    fireEvent.changeText(senhaInput, "123456");

    expect(emailInput.props.value).toBe("teste@email.com");
    expect(senhaInput.props.value).toBe("123456");
  });

});