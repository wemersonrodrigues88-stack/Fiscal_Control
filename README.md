# Fiscal Control

Sistema de gestão fiscal mensal com autenticação por perfil e persistência central compartilhada.

## Estado operacional

A interface da versão congelada é preservada. O estado operacional `fc_*` é sincronizado entre os usuários por D1 através do Worker, permitindo que alterações feitas por gerente, coordenador ou analista sejam compartilhadas entre dispositivos.

## Regra de validação

Antes de considerar a persistência concluída, validar em dois dispositivos:

1. Gerente adiciona uma loja para um analista e salva.
2. Outro dispositivo, logado como o analista, atualiza a tela.
3. A loja deve aparecer imediatamente na carteira do analista.
4. Repetir o teste no sentido inverso com uma alteração operacional.

A interface não deve receber novas funcionalidades enquanto a persistência estiver sendo validada.
